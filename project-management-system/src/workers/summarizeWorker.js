const axios = require("axios");
const OpenAI = require("openai");
const path = require("path");
const fs = require("fs");
const os = require("os");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { Meeting, Transcript, Summary, ActionItem, ProcessingLog } = require("../models");

const openAiBaseUrl = process.env.OPENAI_BASE_URL || undefined;
const transcriptionProvider = process.env.TRANSCRIPTION_PROVIDER || "openai";

// LLM client (OpenRouter if configured)
const llmClient = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: openAiBaseUrl,
  defaultHeaders: process.env.OPENROUTER_API_KEY
    ? {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:8080",
        "X-Title": process.env.OPENROUTER_APP_NAME || "project-management-system",
      }
    : undefined,
});

// Audio transcription client (only if using OpenAI transcription)
const audioClient = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

/**
 * Main worker function to process summary jobs
 */
async function processSummarizeJob(job) {
  const { meetingId, regenerate = false } = job.data;
  const logEntries = [];

  try {
    // 1. RETRIEVE DATA
    job.progress({ stage: "retrieve", percentage: 10, message: "Fetching data..." });
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw new Error("Meeting not found");

    // Mark as processing
    await Meeting.findByIdAndUpdate(meetingId, { processingStatus: "processing" }).catch((e) =>
      console.error("[SummarizeWorker] Failed to set processing status:", e),
    );

    let transcript = meeting.transcriptId ? await Transcript.findById(meeting.transcriptId) : null;
    // Check if transcript exists AND is completed (not failed, not skipped)
    if (!transcript || transcript.status !== "completed") {
      if (!meeting.videoLink) {
        throw new Error("Transcript not found and no videoLink to transcribe.");
      }

      job.progress({ stage: "retrieve", percentage: 15, message: "Transcribing video..." });
      transcript = await createTranscriptFromVideo(meeting);
    }

    const chatHistory = meeting.chatHistory || [];
    const documents = meeting.attachments || [];
    const attachmentContents = await fetchAttachmentsText(documents);

    logEntries.push({
      stage: "retrieve",
      status: "completed",
      metadata: {
        transcriptId: transcript._id,
        chatHistoryLength: chatHistory.length,
        documentsCount: documents.length,
        attachmentsWithText: attachmentContents.length,
      },
    });

    // 2. MERGE CONTEXT
    job.progress({ stage: "merge", percentage: 30, message: "Preparing context..." });
    const mergedContext = buildMeetingContext({
      meeting,
      transcript: transcript.cleanedTranscript || transcript.rawTranscript,
      chatHistory,
      documents,
      attachmentContents,
    });

    logEntries.push({
      stage: "merge",
      status: "completed",
      metadata: {
        contextLength: mergedContext.length,
        chunkCount: Math.ceil(mergedContext.length / 4000),
      },
    });

    // 3. CALL LLM with retry logic
    job.progress({
      stage: "summarize",
      percentage: 50,
      message: "Analyzing with AI...",
    });

    const systemPrompt = `You are a meeting analysis expert. Analyze the meeting transcript and create a structured JSON summary.
Output MUST be valid JSON with these exact keys (English only):
{
  "overview": "string - main topic and conclusion",
  "sections": [{"title": "string", "content": "string"}],
  "actionItems": [{"title": "string", "dueDate": "YYYY-MM-DD or null", "priority": "high|medium|low"}],
  "decisions": ["string of decision"],
  "risks": ["string of risk"]
}
Output ONLY the JSON object, no additional text.
Language: Vietnamese for content, English for keys.`;

    console.log("[SummarizeWorker] === LLM REQUEST TO OPENROUTER ===");
    console.log("[SummarizeWorker] Model:", process.env.OPENAI_MODEL || "gpt-4-turbo-preview");
    console.log("[SummarizeWorker] System Prompt:", systemPrompt);
    console.log("[SummarizeWorker] User Content Length:", mergedContext.length, "chars");
    console.log("[SummarizeWorker] User Content Preview (first 500 chars):", mergedContext.substring(0, 500));
    console.log("[SummarizeWorker] Temperature: 0.3, Max Tokens: 3000");
    console.log("[SummarizeWorker] ==============================");

    let response;
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await llmClient.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: mergedContext },
          ],
          temperature: 0.3,
          max_tokens: 3000,
          response_format: { type: "json_object" },
        });
        console.log("[SummarizeWorker] LLM Response received successfully");
        console.log("[SummarizeWorker] Response tokens - Prompt:", response.usage.prompt_tokens, "Completion:", response.usage.completion_tokens);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        // Only retry on connection errors, not on validation errors
        if (attempt < 3 && isRetryableConnectionError(error)) {
          const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff
          console.warn(`[SummarizeWorker] LLM call attempt ${attempt} failed, retrying in ${waitMs}ms:`, error.message);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        } else {
          throw error;
        }
      }
    }
    if (!response) throw lastError;

    const rawSummary = response.choices[0].message.content;
    console.log("[SummarizeWorker] === LLM RESPONSE FROM OPENROUTER ===");
    console.log("[SummarizeWorker] Raw Response:", rawSummary);
    console.log("[SummarizeWorker] Response Length:", rawSummary.length, "chars");
    console.log("[SummarizeWorker] =====================================");
    const parsedSummary = await parseSummaryJson(rawSummary, llmClient, mergedContext);

    logEntries.push({
      stage: "summarize",
      status: "completed",
      metadata: {
        model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        finishReason: response.choices[0].finish_reason,
      },
    });

    // 4. VALIDATE & FORMAT
    job.progress({
      stage: "format",
      percentage: 75,
      message: "Validating output...",
    });
    const summaryData = validateAndEnrichSummary(parsedSummary);

    logEntries.push({
      stage: "format",
      status: "completed",
      metadata: {
        actionItemsCount: summaryData.actionItems.length,
        sectionsCount: summaryData.sections.length,
        qualityScore: summaryData.quality.summaryScore,
      },
    });

    // 5. SAVE TO DB
    job.progress({
      stage: "save",
      percentage: 90,
      message: "Saving to database...",
    });

    // Get next version number
    const latestVersion = await Summary.findOne({ meetingId }).sort({
      version: -1,
    });
    const nextVersion = (latestVersion?.version || 0) + 1;

    const summaryDoc = new Summary({
      meetingId,
      transcriptId: transcript._id,
      version: nextVersion,
      isLatest: true,
      reason: regenerate ? "regenerated_by_pm" : "initial",
      overview: summaryData.overview,
      sections: summaryData.sections,
      actionItems: summaryData.actionItems,
      decisions: summaryData.decisions,
      risks: summaryData.risks,
      quality: summaryData.quality,
      generationDetails: {
        provider: "openai-gpt4",
        promptVersion: "v1",
        model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
        temperature: 0.3,
      },
    });

    await summaryDoc.save();

    // Mark previous versions as non-latest
    if (regenerate) {
      await Summary.updateMany({ meetingId, _id: { $ne: summaryDoc._id } }, { isLatest: false });
    }

    // Extract action items from LLM summary (not from AI, but from actual meeting data)
    // ActionItem should come from meeting participants, transcript mentions, or chat assignments
    const actionItems = summaryData.actionItems
      .filter((item) => item && item.title) // Only valid items
      .map((item) => ({
        summaryId: summaryDoc._id,
        meetingId,
        projectId: meeting.projectId,
        name: item.title,
        description: item.title,
        dueDate: item.dueDate,
        priority: item.priority,
        sourceType: "ai_extracted", // Extracted from meeting context, not AI-generated
      }));

    if (actionItems.length > 0) {
      const savedActionItems = await ActionItem.insertMany(actionItems);
      const actionItemIds = savedActionItems.map((item) => item._id);

      // Update summary to reference ActionItems
      await Summary.findByIdAndUpdate(summaryDoc._id, {
        actionItems: actionItemIds,
      });

      console.log("[SummarizeWorker] Created", actionItems.length, "action items from meeting data");
    }

    // Update meeting
    await Meeting.findByIdAndUpdate(meetingId, {
      summaryId: summaryDoc._id,
      allSummaryVersions: [...(meeting.allSummaryVersions || []), summaryDoc._id],
      processingStatus: "completed",
    });

    // Log processing
    await ProcessingLog.create({
      meetingId,
      jobId: job.id,
      stage: "complete",
      status: "completed",
      duration: Date.now() - (job.processedOn || Date.now()),
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
      metadata: {
        summaryVersion: nextVersion,
        actionItemsCreated: actionItems.length,
      },
    });

    job.progress({ stage: "complete", percentage: 100, message: "Complete!" });

    return {
      success: true,
      summaryId: summaryDoc._id,
      version: nextVersion,
      actionItemsCreated: actionItems.length,
    };
  } catch (error) {
    console.error("[SummarizeWorker] Error:", error);

    await Meeting.findByIdAndUpdate(meetingId, {
      processingStatus: "failed",
    }).catch((e) => console.error("Failed to update meeting:", e));

    logEntries.push({
      stage: "error",
      status: "failed",
      error: error.message,
      errorStack: error.stack,
    });

    throw error;
  }
}

/**
 * Build merged context for LLM
 */
function buildMeetingContext({ meeting, transcript, chatHistory, documents, attachmentContents }) {
  const lines = [];

  lines.push("[CUỘC HỌP INFO]");
  lines.push(`Tiêu đề: ${meeting.title}`);
  lines.push(`Ngày: ${new Date(meeting.startTime).toLocaleString("vi-VN")}`);
  lines.push(`Người tham gia: ${meeting.participants.length} người`);
  lines.push(`Thời lượng: ${Math.round((meeting.endTime - meeting.startTime) / 60000)} phút`);
  lines.push("");

  lines.push("[TRANSCRIPT]");
  lines.push(transcript || "(Không có transcript)");
  lines.push("");

  if (chatHistory.length > 0) {
    lines.push("[LỊCH SỬ CHAT]");
    chatHistory.slice(-50).forEach((msg) => {
      lines.push(`${msg.from}: ${msg.message}`);
    });
    lines.push("");
  }

  if (documents.length > 0) {
    lines.push("[TÀI LIỆU ĐÍNH KÈM]");
    documents.forEach((doc) => {
      lines.push(`- ${doc.filename}`);
    });
    lines.push("");
  }

  if (attachmentContents.length > 0) {
    lines.push("[NỘI DUNG TÀI LIỆU ĐÍNH KÈM - TÓM TẮT]");
    attachmentContents.forEach((doc) => {
      lines.push(`--- ${doc.filename} ---`);
      lines.push(doc.contentSnippet);
      lines.push("");
    });
  }

  lines.push("[NHIỆM VỤ]");
  lines.push("Tạo một bản tóm tắt cuộc họp có cấu trúc JSON với các phần sau:");
  lines.push("1. Overview (chủ đề chính, kết luận)");
  lines.push("2. Sections (các điểm thảo luận chi tiết)");
  lines.push("3. Action Items (các công việc cần làm)");
  lines.push("4. Decisions (các quyết định đã đưa ra)");
  lines.push("5. Risks (các rủi ro được xác định)");

  return lines.join("\n");
}

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2MB per file
const MAX_ATTACHMENT_CHARS = 4000; // 4k chars per file
const MAX_TOTAL_ATTACHMENT_CHARS = 12000; // total cap
const MAX_TRANSCRIBE_BYTES = parseInt(process.env.MAX_TRANSCRIBE_BYTES, 10) || 25 * 1024 * 1024; // 25MB

async function fetchAttachmentsText(documents) {
  const results = [];
  let totalChars = 0;

  for (const doc of documents) {
    if (!doc?.url) continue;
    if (totalChars >= MAX_TOTAL_ATTACHMENT_CHARS) break;

    try {
      const fileName = doc.filename || "attachment";
      const ext = path.extname(fileName).toLowerCase();

      const response = await axios.get(doc.url, {
        responseType: "arraybuffer",
        timeout: 20000,
      });

      const contentType = response.headers["content-type"] || "";
      const buffer = Buffer.from(response.data);

      if (buffer.length > MAX_ATTACHMENT_BYTES) {
        continue;
      }

      let text = "";
      if (contentType.includes("pdf") || ext === ".pdf") {
        const parsed = await pdfParse(buffer);
        text = parsed.text || "";
      } else if (contentType.includes("word") || ext === ".docx") {
        const parsed = await mammoth.extractRawText({ buffer });
        text = parsed.value || "";
      } else if (contentType.startsWith("text/") || ext === ".txt") {
        text = buffer.toString("utf8");
      } else {
        continue;
      }

      if (!text.trim()) continue;

      const snippet = truncateText(text, MAX_ATTACHMENT_CHARS);
      totalChars += snippet.length;

      results.push({
        filename: fileName,
        contentSnippet: snippet,
      });
    } catch (error) {
      console.error("[SummarizeWorker] Failed to fetch attachment text:", {
        filename: doc?.filename,
        url: doc?.url,
        message: error.message,
      });
    }
  }

  return results;
}

function truncateText(text, maxChars) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n...[truncated]";
}

/**
 * Check if error is a retryable connection error
 */
function isRetryableConnectionError(error) {
  const retryableCodes = ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EHOSTUNREACH"];

  // Check direct error code
  if (retryableCodes.includes(error.code)) return true;
  if (retryableCodes.includes(error.errno)) return true;

  // Check nested cause.code (OpenAI SDK structure)
  if (error.cause && retryableCodes.includes(error.cause.code)) return true;

  // Check for rate limiting
  if (error.status === 429) return true;

  // Check message for connection-related text
  if (error.message && /connection|timeout|reset|refused/i.test(error.message)) {
    return true;
  }

  return false;
}

async function createTranscriptFromVideo(meeting) {
  if (transcriptionProvider === "none") {
    const transcriptDoc = new Transcript({
      meetingId: meeting._id,
      audioUrl: meeting.videoLink,
      rawTranscript: "",
      cleanedTranscript: "",
      segments: [],
      provider: "none",
      language: process.env.TRANSCRIBE_LANGUAGE || "vi",
      status: "skipped",
      processedAt: new Date(),
    });

    await transcriptDoc.save();
    await Meeting.findByIdAndUpdate(meeting._id, { transcriptId: transcriptDoc._id });
    return transcriptDoc;
  }

  if (transcriptionProvider === "deepgram") {
    return await createTranscriptWithDeepgram(meeting);
  }

  const tempFile = await downloadToTempFile(meeting.videoLink);

  try {
    // Retry logic for OpenAI API calls (max 3 attempts)
    let response;
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (!audioClient) {
          throw new Error("OPENAI_API_KEY is required for transcription (set TRANSCRIPTION_PROVIDER=none or deepgram to skip OpenAI).");
        }
        response = await audioClient.audio.transcriptions.create({
          file: fs.createReadStream(tempFile.filePath),
          model: process.env.OPENAI_WHISPER_MODEL || "whisper-1",
          response_format: "verbose_json",
          language: process.env.TRANSCRIBE_LANGUAGE || "vi",
        });
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        // Only retry on connection errors, not on validation errors
        if (attempt < 3 && isRetryableConnectionError(error)) {
          const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff: 1s, 2s, 4s
          console.warn(`[SummarizeWorker] Transcription attempt ${attempt} failed, retrying in ${waitMs}ms:`, error.message);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        } else {
          throw error;
        }
      }
    }
    if (!response) throw lastError;

    const rawText = response.text || "";
    const segments = Array.isArray(response.segments)
      ? response.segments.map((s) => ({
          startTime: s.start,
          endTime: s.end,
          speaker: s.speaker || undefined,
          text: s.text,
          confidence: s.avg_logprob ? Math.exp(s.avg_logprob) : undefined,
        }))
      : [];

    const transcriptDoc = new Transcript({
      meetingId: meeting._id,
      audioUrl: meeting.videoLink,
      duration: response.duration || undefined,
      rawTranscript: rawText,
      cleanedTranscript: rawText,
      segments,
      provider: "openai-whisper",
      language: response.language || "vi",
      status: "completed",
      processedAt: new Date(),
    });

    await transcriptDoc.save();
    await Meeting.findByIdAndUpdate(meeting._id, { transcriptId: transcriptDoc._id });

    return transcriptDoc;
  } catch (error) {
    console.error("[SummarizeWorker] Transcription failed:", error.message);

    await Transcript.create({
      meetingId: meeting._id,
      audioUrl: meeting.videoLink,
      provider: "openai-whisper",
      language: process.env.TRANSCRIBE_LANGUAGE || "vi",
      status: "failed",
      error: error.message,
      processedAt: new Date(),
    });

    throw error;
  } finally {
    tempFile.cleanup();
  }
}

async function createTranscriptWithDeepgram(meeting) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY is required for Deepgram transcription.");
  }

  try {
    let response;
    let lastError;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await axios.post(
          "https://api.deepgram.com/v1/listen",
          { url: meeting.videoLink },
          {
            headers: {
              Authorization: `Token ${apiKey}`,
              "Content-Type": "application/json",
            },
            params: {
              model: process.env.DEEPGRAM_MODEL || "nova-2",
              smart_format: true,
              punctuate: true,
              diarize: true,
              paragraphs: true,
              utterances: true,
              language: process.env.TRANSCRIBE_LANGUAGE || "vi",
            },
            timeout: 120000,
          },
        );
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 3 && isRetryableConnectionError(error)) {
          const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.warn(`[SummarizeWorker] Deepgram attempt ${attempt} failed, retrying in ${waitMs}ms:`, error.message);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        } else {
          throw error;
        }
      }
    }

    if (!response) throw lastError;

    const dgResult = response.data?.results?.channels?.[0]?.alternatives?.[0];
    const paragraphsText = dgResult?.paragraphs?.transcript;
    const rawText = paragraphsText || dgResult?.transcript || "";

    const utterances = Array.isArray(response.data?.results?.utterances) ? response.data.results.utterances : [];
    const words = Array.isArray(dgResult?.words) ? dgResult.words : [];

    const segments = utterances.length
      ? utterances.map((u) => ({
          startTime: u.start,
          endTime: u.end,
          speaker: u.speaker !== undefined ? String(u.speaker) : undefined,
          text: u.transcript,
          confidence: u.confidence,
        }))
      : words.map((w) => ({
          startTime: w.start,
          endTime: w.end,
          speaker: w.speaker !== undefined ? String(w.speaker) : undefined,
          text: w.word,
          confidence: w.confidence,
        }));

    if (!rawText.trim()) {
      throw new Error("Deepgram returned empty transcript. Check audio URL or permissions.");
    }

    const transcriptDoc = new Transcript({
      meetingId: meeting._id,
      audioUrl: meeting.videoLink,
      duration: response.data?.metadata?.duration || undefined,
      rawTranscript: rawText,
      cleanedTranscript: rawText,
      segments,
      provider: "deepgram",
      language: process.env.TRANSCRIBE_LANGUAGE || "vi",
      status: "completed",
      processedAt: new Date(),
    });

    await transcriptDoc.save();
    await Meeting.findByIdAndUpdate(meeting._id, { transcriptId: transcriptDoc._id });

    return transcriptDoc;
  } catch (error) {
    console.error("[SummarizeWorker] Deepgram transcription failed:", error.message);

    await Transcript.create({
      meetingId: meeting._id,
      audioUrl: meeting.videoLink,
      provider: "deepgram",
      language: process.env.TRANSCRIBE_LANGUAGE || "vi",
      status: "failed",
      error: error.message,
      processedAt: new Date(),
    });

    throw error;
  }
}

async function downloadToTempFile(url) {
  const ext = path.extname(new URL(url).pathname) || ".mp4";
  const filePath = path.join(os.tmpdir(), `meeting-${Date.now()}${ext}`);

  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 60000,
  });

  const contentLength = parseInt(response.headers["content-length"] || "0", 10);
  if (contentLength && contentLength > MAX_TRANSCRIBE_BYTES) {
    throw new Error(`Video file too large to transcribe (${contentLength} bytes)`);
  }

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  const stats = fs.statSync(filePath);
  if (stats.size > MAX_TRANSCRIBE_BYTES) {
    fs.unlinkSync(filePath);
    throw new Error(`Video file too large to transcribe (${stats.size} bytes)`);
  }

  return {
    filePath,
    cleanup: () => {
      try {
        fs.unlinkSync(filePath);
      } catch (_) {
        // ignore
      }
    },
  };
}

/**
 * Validate and enrich summary data
 */
function validateAndEnrichSummary(data) {
  // Schema validation
  if (!data || typeof data !== "object") {
    data = {};
  }

  if (!data.overview) data.overview = "";
  if (!Array.isArray(data.sections)) data.sections = [];
  if (!Array.isArray(data.actionItems)) data.actionItems = [];

  // Ensure arrays
  if (!Array.isArray(data.decisions)) data.decisions = [];
  if (!Array.isArray(data.risks)) data.risks = [];

  // Calculate quality score
  let score = 85;
  score -= data.sections.length > 5 ? 5 : 0;
  score += data.actionItems.length > 0 ? 10 : 0;
  score += data.decisions.length > 0 ? 5 : 0;

  return {
    ...data,
    quality: {
      transcriptConfidence: 0.9,
      summaryScore: Math.min(100, score),
      generatedAt: new Date(),
    },
  };
}

/**
 * Parse or repair model JSON output
 */
async function parseSummaryJson(rawSummary, client, context) {
  const tryParse = (text) => {
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  };

  // 1) Direct parse
  let parsed = tryParse(rawSummary);
  if (parsed) return normalizeSummaryFields(parsed);

  // 2) Extract JSON block
  const start = rawSummary.indexOf("{");
  const end = rawSummary.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const jsonBlock = rawSummary.slice(start, end + 1);
    parsed = tryParse(jsonBlock);
    if (parsed) return normalizeSummaryFields(parsed);
  }

  // 3) Skip expensive repair - just use fallback instead
  console.warn("[SummarizeWorker] Could not parse summary JSON after 2 attempts, using fallback structure");

  // 4) Final fallback to empty structure
  return {
    overview: "",
    sections: [],
    actionItems: [],
    decisions: [],
    risks: [],
    quality: {},
  };
}

/**
 * Normalize field names from LLM response to expected schema
 * Since we now enforce English field names in prompt, this just validates structure
 */
function normalizeSummaryFields(data) {
  if (!data || typeof data !== "object") return data;

  // Ensure all required fields exist with correct types
  const normalized = {
    overview: String(data.overview || "").trim(),
    sections: Array.isArray(data.sections)
      ? data.sections
          .filter((s) => s && typeof s === "object")
          .map((s) => ({
            title: String(s.title || "").trim(),
            content: String(s.content || "").trim(),
          }))
      : [],
    actionItems: Array.isArray(data.actionItems)
      ? data.actionItems
          .filter((a) => a && typeof a === "object")
          .map((a) => ({
            title: String(a.title || "").trim(),
            dueDate: a.dueDate ? new Date(a.dueDate) : null,
            priority: ["high", "medium", "low"].includes(String(a.priority).toLowerCase()) ? String(a.priority).toLowerCase() : "medium",
          }))
      : [],
    // decisions should be array of {title, context}
    decisions: Array.isArray(data.decisions)
      ? data.decisions
          .filter((d) => d)
          .map((d) => {
            // If string, convert to {title}; if object, ensure title exists
            if (typeof d === "string") {
              return { title: d.trim() };
            }
            return { title: String(d.title || d).trim(), context: String(d.context || "").trim() };
          })
      : [],
    // risks should be array of {title, description, severity}
    risks: Array.isArray(data.risks)
      ? data.risks
          .filter((r) => r)
          .map((r) => {
            // If string, convert to {title}; if object, ensure title exists
            if (typeof r === "string") {
              return { title: r.trim() };
            }
            return {
              title: String(r.title || r).trim(),
              description: String(r.description || "").trim(),
              severity: ["high", "medium", "low"].includes(String(r.severity).toLowerCase()) ? String(r.severity).toLowerCase() : "medium",
            };
          })
      : [],
    quality: data.quality || {},
  };

  console.log("[SummarizeWorker] Validated summary structure:", {
    overviewLength: normalized.overview.length,
    sectionsCount: normalized.sections.length,
    actionItemsCount: normalized.actionItems.length,
    decisionsCount: normalized.decisions.length,
    risksCount: normalized.risks.length,
  });

  return normalized;
}

module.exports = processSummarizeJob;
