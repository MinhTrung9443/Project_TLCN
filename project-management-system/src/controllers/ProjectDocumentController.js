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

      // Only PM can upload project documents
      const userId = req.user._id.toString();
      console.log("🔍 [uploadDocument] Looking for user in members, userId:", userId);

      const userMember = project.members.find((m) => m.userId.toString() === userId);
      console.log("👤 [uploadDocument] userMember found:", userMember ? "YES" : "NO");
      if (userMember) {
        console.log("👤 [uploadDocument] userMember role:", userMember.role);
      }

      if (!userMember || userMember.role !== "PROJECT_MANAGER") {
        console.log("❌ [uploadDocument] Access denied - not PM");
        return res.status(403).json({ message: "Only Project Manager can upload documents" });
      }

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
      const { userIds } = req.body; // Array of user IDs to share with

      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "userIds must be a non-empty array" });
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

      // Validate that all userIds are project members
      const allProjectUserIds = new Set();
      project.members.forEach((m) => allProjectUserIds.add(m.userId.toString()));
      if (project.teams && project.teams.length > 0) {
        project.teams.forEach((team) => {
          if (team.leaderId) allProjectUserIds.add(team.leaderId.toString());
          if (team.members) team.members.forEach((id) => allProjectUserIds.add(id.toString()));
        });
      }

      const validUserIds = userIds.filter((id) => {
        if (!mongoose.Types.ObjectId.isValid(id)) return false;
        return allProjectUserIds.has(id.toString());
      });

      if (validUserIds.length === 0) {
        return res.status(400).json({ message: "No valid project members in userIds" });
      }

      // Add new users to sharedWith (avoid duplicates)
      const currentShared = new Set(document.sharedWith.map((id) => id.toString()));
      validUserIds.forEach((id) => currentShared.add(id.toString()));

      document.sharedWith = Array.from(currentShared).map((id) => mongoose.Types.ObjectId(id));
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
};

module.exports = ProjectDocumentController;
