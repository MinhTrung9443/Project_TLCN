const { Meeting, Transcript, Summary, ActionItem, ProcessingLog } = require("../models");
const summarizeQueue = require("../config/queue");

// Trigger summary generation
exports.triggerSummaryGeneration = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { regenerate = false, options = {} } = req.body;

    // Check if Redis/Queue is available
    const queueReady = summarizeQueue.isQueueReady ? summarizeQueue.isQueueReady() : summarizeQueue.client?.status === "ready";
    if (!queueReady) {
      return res.status(503).json({
        error: "SERVICE_UNAVAILABLE",
        message: "Summary service is temporarily unavailable. Please try again later.",
        detail: "Redis connection required for summary generation",
      });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Check if transcript exists
    if (!meeting.transcriptId) {
      return res.status(400).json({
        statusCode: 400,
        error: "TRANSCRIPT_NOT_FOUND",
        message: "Transcript must be generated first",
      });
    }

    // Check if summary is already being processed
    const activeJobs = await summarizeQueue.getJobs(["active", "waiting"]);
    const isProcessing = activeJobs.some((job) => job.data.meetingId === meetingId);

    if (isProcessing) {
      return res.status(409).json({
        statusCode: 409,
        error: "PROCESSING_IN_PROGRESS",
        message: "Summary already being generated",
      });
    }

    // Add job to queue
    const job = await summarizeQueue.add(
      {
        meetingId,
        regenerate,
        options,
      },
      {
        attempts: parseInt(process.env.MAX_SUMMARY_RETRIES) || 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: false,
        timeout: parseInt(process.env.SUMMARY_TIMEOUT) || 300000,
      },
    );

    // Mark as processing
    await Meeting.findByIdAndUpdate(meetingId, {
      "processingStatus.summary": "processing",
    });

    res.status(202).json({
      success: true,
      jobId: job.id,
      message: "Summary generation started",
      statusUrl: `/api/v1/meetings/${meetingId}/summary/status`,
      estimatedTime: 120,
    });
  } catch (error) {
    console.error("[SummaryController] Error triggering generation:", error);
    res.status(500).json({
      error: "GENERATION_FAILED",
      message: error.message,
    });
  }
};

// Get summary status
exports.getSummaryStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { jobId } = req.query;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    if (!jobId) {
      // Return current processing status
      const activeJobs = await summarizeQueue.getJobs(["active", "waiting"]);
      const currentJob = activeJobs.find((j) => j.data.meetingId === meetingId);

      if (currentJob) {
        const progress = currentJob._progress || {};
        return res.json({
          jobId: currentJob.id,
          status: "processing",
          progress: progress || { stage: "processing", percentage: 0 },
          error: null,
        });
      }

      // Check for completed
      const latestSummary = await Summary.findOne({
        meetingId,
        isLatest: true,
      });
      if (latestSummary) {
        return res.json({
          status: "completed",
          result: { summaryId: latestSummary._id, version: latestSummary.version },
          error: null,
        });
      }

      return res.json({
        status: "pending",
        progress: null,
        error: null,
      });
    }

    // Check specific job by ID
    const job = await summarizeQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const progress = job._progress || {};
    const state = await job.getState();

    if (state === "completed") {
      const result = job.returnvalue;
      return res.json({
        jobId: job.id,
        status: "completed",
        progress: { stage: "complete", percentage: 100 },
        result: { summaryId: result.summaryId, version: result.version },
        error: null,
      });
    }

    if (state === "failed") {
      return res.status(400).json({
        jobId: job.id,
        status: "failed",
        error: job.failedReason,
      });
    }

    res.json({
      jobId: job.id,
      status: "processing",
      progress,
      error: null,
    });
  } catch (error) {
    console.error("[SummaryController] Error checking status:", error);
    res.status(500).json({
      error: "STATUS_CHECK_FAILED",
      message: error.message,
    });
  }
};

// Get summary content
exports.getSummary = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { version } = req.query;

    let query = { meetingId };
    if (version === "latest" || !version) {
      query.isLatest = true;
    } else {
      query.version = parseInt(version);
    }

    const summary = await Summary.findOne(query);
    if (!summary) {
      return res.status(404).json({ error: "Summary not found" });
    }

    // Get all versions for navigation
    const allVersions = await Summary.find({ meetingId }).select("version isLatest createdAt").sort({ version: -1 });

    res.json({
      summary: summary.toObject(),
      availableVersions: allVersions.map((v) => v.version),
    });
  } catch (error) {
    console.error("[SummaryController] Error fetching summary:", error);
    res.status(500).json({
      error: "FETCH_FAILED",
      message: error.message,
    });
  }
};

// List all summaries
exports.listSummaries = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const total = await Summary.countDocuments({ meetingId });
    const summaries = await Summary.find({ meetingId })
      .select("version isLatest reason createdAt quality")
      .sort({ version: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.json({
      total,
      summaries: summaries.map((s) => ({
        version: s.version,
        isLatest: s.isLatest,
        reason: s.reason,
        createdAt: s.createdAt,
        quality: s.quality,
        url: `/api/v1/summaries/${s._id}`,
      })),
    });
  } catch (error) {
    console.error("[SummaryController] Error listing summaries:", error);
    res.status(500).json({
      error: "LIST_FAILED",
      message: error.message,
    });
  }
};

// Create task from action item
exports.createTaskFromActionItem = async (req, res) => {
  try {
    const { actionItemId } = req.params;
    const { projectId, boardId, customFields } = req.body;

    const actionItem = await ActionItem.findById(actionItemId);
    if (!actionItem) {
      return res.status(404).json({ error: "Action item not found" });
    }

    // For now, just mark as handled
    // In production, integrate with Task model
    await ActionItem.findByIdAndUpdate(actionItemId, {
      createTaskStatus: "pending",
    });

    res.status(202).json({
      success: true,
      message: "Task creation initiated",
      actionItemId: actionItem._id,
    });
  } catch (error) {
    console.error("[SummaryController] Error creating task:", error);
    res.status(500).json({
      error: "TASK_CREATION_FAILED",
      message: error.message,
    });
  }
};

// Get action items for a meeting
exports.getActionItems = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status, priority } = req.query;

    let query = { meetingId };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const actionItems = await ActionItem.find(query)
      .populate("owner", "name email")
      .populate("linkedTaskId", "title status")
      .sort({ priority: -1, dueDate: 1 });

    res.json({
      total: actionItems.length,
      actionItems,
    });
  } catch (error) {
    console.error("[SummaryController] Error fetching action items:", error);
    res.status(500).json({
      error: "FETCH_FAILED",
      message: error.message,
    });
  }
};

module.exports = exports;
