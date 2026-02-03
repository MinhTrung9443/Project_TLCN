const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const { Project, Task, Comment, Meeting, ProjectDocument } = require("../models");

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
  sourceType: "project",
});

const mapTaskAttachments = (tasks) => {
  const items = [];
  tasks.forEach((task) => {
    (task.attachments || []).forEach((att) => {
      items.push({
        id: `${task._id}-${att.public_id}`,
        filename: att.filename,
        url: att.url,
        uploadedAt: att.uploadedAt,
        sourceType: "task",
        parent: {
          taskId: task._id,
          taskKey: task.key,
          taskName: task.name,
        },
      });
    });
  });
  return items;
};

const mapCommentAttachments = (comments, taskMap) => {
  const items = [];
  comments.forEach((comment) => {
    const taskInfo = taskMap.get(String(comment.taskId));
    (comment.attachments || []).forEach((att) => {
      items.push({
        id: `${comment._id}-${att.public_id}`,
        filename: att.filename,
        url: att.url,
        uploadedAt: att.uploadedAt,
        sourceType: "comment",
        parent: {
          commentId: comment._id,
          taskId: comment.taskId,
          taskKey: taskInfo?.key,
          taskName: taskInfo?.name,
        },
      });
    });
  });
  return items;
};

const mapMeetingAttachments = (meetings) => {
  const items = [];
  meetings.forEach((meeting) => {
    (meeting.attachments || []).forEach((att) => {
      items.push({
        id: `${meeting._id}-${att.public_id}`,
        filename: att.filename,
        url: att.url,
        uploadedAt: att.uploadedAt,
        sourceType: "meeting",
        parent: {
          meetingId: meeting._id,
          meetingTitle: meeting.title,
        },
      });
    });
  });
  return items;
};

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
      const result = {};

      if (source === "all" || source === "project") {
        const docs = await ProjectDocument.find({ projectId }).sort({ uploadedAt: -1 }).populate("uploadedBy", "fullname avatar").lean();
        result.projectDocs = docs.map(mapProjectDoc);
      }

      if (source === "all" || source === "task" || source === "comment") {
        const tasks = await Task.find({ projectId, "attachments.0": { $exists: true } })
          .select("_id key name attachments")
          .lean();
        const taskMap = new Map(tasks.map((t) => [String(t._id), { key: t.key, name: t.name }]));

        if (source === "all" || source === "task") {
          result.taskAttachments = mapTaskAttachments(tasks);
        }

        if (source === "all" || source === "comment") {
          const taskIds = tasks.map((t) => t._id);
          if (taskIds.length > 0) {
            const comments = await Comment.find({ taskId: { $in: taskIds }, "attachments.0": { $exists: true } })
              .select("taskId attachments")
              .lean();
            result.commentAttachments = mapCommentAttachments(comments, taskMap);
          } else {
            result.commentAttachments = [];
          }
        }
      }

      if (source === "all" || source === "meeting") {
        const meetings = await Meeting.find({ projectId, "attachments.0": { $exists: true } })
          .select("_id title attachments")
          .lean();
        result.meetingAttachments = mapMeetingAttachments(meetings);
      }

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

      const project = await getProjectByKey(projectKey);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const newDoc = await ProjectDocument.create({
        projectId: project._id,
        filename: req.file.originalname,
        url: req.file.path,
        public_id: req.file.filename,
        category: category || "other",
        version: version || "v1",
        tags: normalizeTags(tags),
        uploadedBy: req.user._id,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      const populated = await newDoc.populate("uploadedBy", "fullname avatar");

      return res.status(201).json({ document: mapProjectDoc(populated) });
    } catch (error) {
      console.error("[ProjectDocumentController] uploadDocument error:", error);
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

      try {
        await cloudinary.uploader.destroy(document.public_id);
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
};

module.exports = ProjectDocumentController;
