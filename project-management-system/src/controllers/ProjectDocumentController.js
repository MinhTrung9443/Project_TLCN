const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const { Project, ProjectDocument, User } = require("../models");

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags))
    return tags
      .filter(Boolean)
      .map((t) => String(t).trim())
      .filter(Boolean);
  return String(tags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
};

const getProjectByKey = async (projectKey) => {
  if (!projectKey) return null;
  return Project.findOne({ key: projectKey.toUpperCase() });
};

const mapProjectDoc = (doc) => ({
  _id: doc._id,
  filename: doc.filename,
  url: doc.url,
  category: doc.category,
  version: doc.version,
  tags: doc.tags || [],
  uploadedBy: doc.uploadedBy,
  uploadedAt: doc.uploadedAt,
  mimeType: doc.mimeType,
  size: doc.size,
  sourceType: doc.sourceType || "project",
  parent: doc.parent,
  sharedWith: doc.sharedWith || [],
});

const ProjectDocumentController = {
  async listDocuments(req, res) {
    try {
      const { projectKey } = req.params;
      const { source = "all" } = req.query;

      const project = await getProjectByKey(projectKey);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const projectId = project._id;
      const userId = req.user?._id;
      const isAdmin = req.user?.role === "admin";

      const query = { projectId };

      if (!isAdmin) {
        query.$or = [{ sharedWith: userId }, { uploadedBy: userId }];
      }

      if (source !== "all") {
        query.sourceType = source;
      }

      const docs = await ProjectDocument.find(query).sort({ uploadedAt: -1 }).populate("uploadedBy", "fullname avatar").lean();

      const result = {
        projectDocs: [],
        taskAttachments: [],
        commentAttachments: [],
        meetingAttachments: [],
      };

      docs.forEach((doc) => {
        const mapped = mapProjectDoc(doc);
        if (doc.sourceType === "task") result.taskAttachments.push(mapped);
        else if (doc.sourceType === "comment") result.commentAttachments.push(mapped);
        else if (doc.sourceType === "meeting") result.meetingAttachments.push(mapped);
        else result.projectDocs.push(mapped);
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("[ProjectDocumentController] listDocuments error:", error);
      return res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  async uploadDocument(req, res) {
    try {
      const { projectKey } = req.params;
      const { category, version, tags } = req.body;

      console.log("📁 [uploadDocument] START - projectKey:", projectKey);
      console.log("📁 [uploadDocument] category:", category, "version:", version, "tags:", tags);
      console.log("📁 [uploadDocument] user:", req.user._id.toString());

      const project = await getProjectByKey(projectKey);
      if (!project) {
        console.log("❌ [uploadDocument] Project not found:", projectKey);
        return res.status(404).json({ message: "Project not found" });
      }

      console.log("✅ [uploadDocument] Project found:", project._id.toString());
      console.log("👥 [uploadDocument] Project members count:", project.members?.length);
      console.log("👥 [uploadDocument] Project teams count:", project.teams?.length);

      if (!req.file) {
        console.log("❌ [uploadDocument] No file provided");
        return res.status(400).json({ message: "No file provided" });
      }

      console.log("📄 [uploadDocument] File info:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        filename: req.file.filename,
      });

      // Share with ALL members + team leaders + team members
      const allUserIds = new Set();

      // Add all project members
      project.members.forEach((m) => allUserIds.add(m.userId.toString()));
      console.log("👥 [uploadDocument] Added members, total users:", allUserIds.size);

      // Add all team leaders and team members
      if (project.teams && project.teams.length > 0) {
        project.teams.forEach((team) => {
          if (team.leaderId) {
            allUserIds.add(team.leaderId.toString());
          }
          if (team.members && team.members.length > 0) {
            team.members.forEach((memberId) => {
              allUserIds.add(memberId.toString());
            });
          }
        });
        console.log("👥 [uploadDocument] Added teams, total users:", allUserIds.size);
      }

      console.log("🔄 [uploadDocument] Converting userIds to ObjectIds...");
      const sharedWith = Array.from(allUserIds).map((id) => new mongoose.Types.ObjectId(id));
      console.log("✅ [uploadDocument] sharedWith array created, length:", sharedWith.length);

      const docData = {
        projectId: project._id,
        filename: req.file.originalname,
        url: req.file.path,
        public_id: req.file.filename,
        category: category || "other",
        version: version || "v1",
        tags: normalizeTags(tags),
        sourceType: "project",
        parent: {},
        uploadedBy: req.user._id,
        sharedWith,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };

      console.log("💾 [uploadDocument] Creating document with data:", JSON.stringify(docData, null, 2));

      const newDoc = await ProjectDocument.create(docData);
      console.log("✅ [uploadDocument] Document created:", newDoc._id.toString());

      const populated = await newDoc.populate("uploadedBy", "fullname avatar");
      console.log("✅ [uploadDocument] Document populated successfully");

      return res.status(201).json({ document: mapProjectDoc(populated) });
    } catch (error) {
      console.error("❌❌❌ [uploadDocument] ERROR:", error.message);
      console.error("❌❌❌ [uploadDocument] ERROR STACK:", error.stack);
      console.error("❌❌❌ [uploadDocument] ERROR FULL:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      return res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  async deleteDocument(req, res) {
    try {
      const { projectKey, documentId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const project = await getProjectByKey(projectKey);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const document = await ProjectDocument.findOne({ _id: documentId, projectId: project._id });
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (document.sourceType !== "project") {
        return res.status(400).json({ message: "Only project documents can be deleted" });
      }

      if (!document.uploadedBy || document.uploadedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Only uploader can delete document" });
      }

      try {
        if (document.public_id) {
          await cloudinary.uploader.destroy(document.public_id);
        }
      } catch (cloudError) {
        console.warn("[ProjectDocumentController] Cloudinary delete failed:", cloudError.message);
      }

      await document.deleteOne();

      return res.status(200).json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("[ProjectDocumentController] deleteDocument error:", error);
      return res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  async shareDocument(req, res) {
    try {
      const { projectKey, documentId } = req.params;
      const { emails } = req.body;

      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ message: "Please select at least one member" });
      }

      const project = await getProjectByKey(projectKey);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const document = await ProjectDocument.findOne({ _id: documentId, projectId: project._id });
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Only uploader can share document
      if (!document.uploadedBy.equals(req.user._id)) {
        return res.status(403).json({ message: "Only the uploader can share this document" });
      }

      // Resolve emails to userIds
      const User = require("../models/User");
      const users = await User.find({ email: { $in: emails } }).select("_id");
      const targetUserIds = users.map((u) => u._id.toString());

      if (targetUserIds.length === 0) {
        return res.status(400).json({ message: "No valid users found with these emails" });
      }

      console.log("🔄 [shareDocument] Sharing with:", { emails, resolvedCount: targetUserIds.length });

      // Validate that all userIds are project members
      const allProjectUserIds = new Set();
      project.members.forEach((m) => allProjectUserIds.add(m.userId.toString()));
      if (project.teams && project.teams.length > 0) {
        project.teams.forEach((team) => {
          if (team.leaderId) allProjectUserIds.add(team.leaderId.toString());
          if (team.members) team.members.forEach((id) => allProjectUserIds.add(id.toString()));
        });
      }

      const validUserIds = targetUserIds.filter((id) => allProjectUserIds.has(id));

      if (validUserIds.length === 0) {
        return res.status(400).json({ message: "Selected users are not project members" });
      }

      console.log("✅ [shareDocument] Valid users to share with:", validUserIds.length);

      // Add new users to sharedWith (avoid duplicates)
      const currentShared = new Set(document.sharedWith.map((id) => id.toString()));
      validUserIds.forEach((id) => currentShared.add(id));

      document.sharedWith = Array.from(currentShared).map((id) => new mongoose.Types.ObjectId(id));
      await document.save();

      const populated = await document.populate("uploadedBy", "fullname avatar");

      return res.status(200).json({
        message: "Document shared successfully",
        document: mapProjectDoc(populated),
      });
    } catch (error) {
      console.error("[ProjectDocumentController] shareDocument error:", error);
      return res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  async unshareDocument(req, res) {
    try {
      const { projectKey, documentId } = req.params;
      const { emails } = req.body;

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ message: "Please provide emails to unshare" });
      }

      const project = await getProjectByKey(projectKey);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const document = await ProjectDocument.findById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (document.uploadedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Only uploader can unshare document" });
      }

      // Resolve emails to user IDs
      const targetUsers = await User.find({ email: { $in: emails } }).select("_id");
      const targetUserIds = targetUsers.map((u) => u._id.toString());

      console.log("🔓 [unshareDocument] Removing users:", targetUserIds.length);

      // Remove users from sharedWith
      const currentShared = new Set(document.sharedWith.map((id) => id.toString()));
      targetUserIds.forEach((id) => currentShared.delete(id));

      document.sharedWith = Array.from(currentShared).map((id) => new mongoose.Types.ObjectId(id));
      await document.save();

      const populated = await document.populate("uploadedBy", "fullname avatar");

      return res.status(200).json({
        message: "Document unshared successfully",
        document: mapProjectDoc(populated),
      });
    } catch (error) {
      console.error("[ProjectDocumentController] unshareDocument error:", error);
      return res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  async summarizeDocument(req, res) {
    try {
      const { projectKey, documentId } = req.params;
      const { force } = req.query; // Add force parameter

      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const project = await getProjectByKey(projectKey);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const document = await ProjectDocument.findOne({ _id: documentId, projectId: project._id });
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check access permission: Admin, Uploader, or SharedWith
      const userId = req.user?._id;
      const isAdmin = req.user?.role === "admin";
      const isUploader = document.uploadedBy.toString() === userId.toString();
      const isShared = document.sharedWith.some((id) => id.toString() === userId.toString());
      
      if (!isAdmin && !isUploader && !isShared) {
        return res.status(403).json({ message: "You don't have permission to view this document" });
      }

      // Return existing summary to save cost if not forcing regeneration
      if (document.summary && force !== "true") {
        return res.status(200).json({ summary: document.summary });
      }

      // If no URL or public_id, cannot summarize
      if (!document.url) {
        return res.status(400).json({ message: "Document URL not found" });
      }

      // Fetch file content
      const axios = require("axios");
      const fs = require("fs");
      const os = require("os");
      const path = require("path");

      console.log(`[summarizeDocument] Downloading file from: ${document.url}`);
      const response = await axios.get(document.url, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data);
      let textContent = "";
      let uploadedFileUri = null;
      let uploadedFileMimeType = null;
      let uploadedFileName = null;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "GEMINI_API_KEY is not configured on the server" });
      }
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const { GoogleAIFileManager } = require("@google/generative-ai/server");

      let mimeType = document.mimeType || "application/octet-stream";
      let filename = (document.filename || "").toLowerCase();
      let ext = path.extname(filename);

      // Cloudinary missing extension/mimeType workaround
      if (document.url.includes("/video/upload/")) {
         if (mimeType === "application/octet-stream") mimeType = "video/mp4";
         if (!ext) ext = ".mp4";
      } else if (document.url.includes("/image/upload/")) {
         if (mimeType === "application/octet-stream") mimeType = "image/jpeg";
         if (!ext) ext = ".jpg";
      } else if (document.url.endsWith(".mp4") && mimeType === "application/octet-stream") {
         mimeType = "video/mp4";
         ext = ".mp4";
      }

      // Handle PDF, Video, Audio, and Image natively using Gemini File API
      if (
        mimeType.startsWith("video/") ||
        mimeType.startsWith("audio/") ||
        mimeType.startsWith("image/") ||
        mimeType === "application/pdf" ||
        [".mp4", ".mov", ".avi", ".mp3", ".wav", ".png", ".jpg", ".jpeg", ".pdf"].includes(ext)
      ) {
        console.log(`[summarizeDocument] Using GoogleAIFileManager for ${filename} (${mimeType})`);
        const fileManager = new GoogleAIFileManager(apiKey);
        
        // Write to temp file
        const tempPath = path.join(os.tmpdir(), `gemini-upload-${Date.now()}${ext || ".tmp"}`);
        fs.writeFileSync(tempPath, buffer);

        // Upload
        const uploadResult = await fileManager.uploadFile(tempPath, {
          mimeType: mimeType === "application/octet-stream" ? "application/pdf" : mimeType,
          displayName: document.filename || "file",
        });

        uploadedFileUri = uploadResult.file.uri;
        uploadedFileMimeType = uploadResult.file.mimeType;
        uploadedFileName = uploadResult.file.name;

        // Cleanup temp file
        fs.unlinkSync(tempPath);

      } else if (
        mimeType.includes("wordprocessingml.document") ||
        ext === ".docx"
      ) {
        // Handle DOCX using Mammoth
        console.log(`[summarizeDocument] Extracting DOCX text using Mammoth`);
        const mammoth = require("mammoth");
        const docxData = await mammoth.extractRawText({ buffer });
        textContent = docxData.value;

      } else {
        // Fallback to plain text decoding for everything else (.txt, .md, .csv, code files, no-extension files)
        console.log(`[summarizeDocument] Fallback to plain text decoding`);
        textContent = buffer.toString("utf-8");
      }

      if (!uploadedFileUri && (!textContent || textContent.trim() === "")) {
        return res.status(400).json({ message: "Could not extract content from document or document is empty" });
      }

      // Limit text length to avoid token limit errors
      // Free tier token limit is 250k. We should limit to less characters just in case it's not a media file.
      if (textContent && textContent.length > 50000) {
         console.log(`[summarizeDocument] Text is very long (${textContent.length} chars). Truncating to fit within free tier limits.`);
         textContent = textContent.substring(0, 50000) + "\n\n...[Phần còn lại đã bị cắt vì giới hạn độ dài của file]";
      }

      // Call Gemini API
      console.log(`[summarizeDocument] Calling Gemini API (text length: ${textContent.length}, uri: ${uploadedFileUri || "None"})`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `Hãy tóm tắt nội dung tài liệu (hoặc video/audio) sau đây bằng tiếng Việt. Nếu là code thì giải thích nó làm gì. Nhấn mạnh các điểm chính, công việc cần làm hoặc quyết định quan trọng (nếu có):\n\n${textContent}`;
      
      let result;
      if (uploadedFileUri) {
        result = await model.generateContent([
          { fileData: { fileUri: uploadedFileUri, mimeType: uploadedFileMimeType } },
          { text: prompt }
        ]);
      } else {
        result = await model.generateContent(prompt);
      }
      
      const summaryText = result.response.text();

      // Delete the file from Gemini to save space
      if (uploadedFileName) {
        try {
          const fileManager = new GoogleAIFileManager(apiKey);
          await fileManager.deleteFile(uploadedFileName);
          console.log(`[summarizeDocument] Deleted temporary Gemini file ${uploadedFileName}`);
        } catch (e) {
          console.warn("[summarizeDocument] Could not delete Gemini file:", e.message);
        }
      }

      // Save summary
      document.summary = summaryText;
      await document.save();

      return res.status(200).json({ summary: summaryText });
    } catch (error) {
      console.error("[ProjectDocumentController] summarizeDocument error:", error);
      
      let msg = "Error summarizing document";
      if (error.message && error.message.includes("429")) {
        msg = "Đã vượt quá giới hạn lượt dùng API miễn phí (Rate Limit) của Gemini, vui lòng thử lại sau vài phút.";
      }

      return res.status(500).json({ message: msg, error: error.message });
    }
  },
};

module.exports = ProjectDocumentController;
