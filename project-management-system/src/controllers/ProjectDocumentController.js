const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const { Project, ProjectDocument } = require("../models");

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

      const query = {
        projectId,
        $or: [{ sharedWith: userId }, { uploadedBy: userId }],
      };

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

      const project = await getProjectByKey(projectKey);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const sharedWith = project.members.map((m) => m.userId);
      if (!sharedWith.some((id) => id.equals(req.user._id))) {
        sharedWith.push(req.user._id);
      }

      const newDoc = await ProjectDocument.create({
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

      if (document.sourceType !== "project") {
        return res.status(400).json({ message: "Only project documents can be deleted" });
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
};

module.exports = ProjectDocumentController;
