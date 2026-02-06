const commentService = require("../services/CommentService");
const Task = require("../models/Task");
const Project = require("../models/Project");
const ProjectDocument = require("../models/ProjectDocument");

const handleGetComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const comments = await commentService.getCommentsByTaskId(taskId);
    res.status(200).json(comments);
  } catch (error) {
    console.error("Error in handleGetComments:", error);
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

const handleCreateComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: User not found." });
    }
    const userId = req.user.id;

    // Xử lý attachments từ files upload
    const attachments = req.files
      ? req.files.map((file) => ({
          filename: file.originalname,
          url: file.path,
          public_id: file.filename,
        }))
      : [];

    // Xử lý attachments từ Project Documents (documentIds)
    const rawDocumentIds = req.body.documentIds;
    const documentIds = Array.isArray(rawDocumentIds) ? rawDocumentIds : rawDocumentIds ? [rawDocumentIds] : [];

    if (documentIds.length > 0) {
      const task = await Task.findById(taskId).lean();
      const projectId = task?.projectId;

      const docs = await ProjectDocument.find({
        _id: { $in: documentIds },
        projectId: projectId,
      }).lean();

      const userIdStr = userId.toString();
      const allowedDocs = docs.filter((doc) => {
        const uploadedBy = doc.uploadedBy?.toString?.() || doc.uploadedBy?.toString?.();
        const sharedIds = (doc.sharedWith || []).map((id) => id.toString());
        return uploadedBy === userIdStr || sharedIds.includes(userIdStr);
      });

      const existingKeys = new Set(attachments.map((att) => att.public_id || att.url));
      allowedDocs.forEach((doc) => {
        const publicId = doc.public_id || doc._id.toString();
        if (existingKeys.has(publicId) || existingKeys.has(doc.url)) return;
        attachments.push({
          filename: doc.filename,
          url: doc.url,
          public_id: publicId,
        });
        existingKeys.add(publicId);
      });
    }

    const comment = await commentService.createComment(
      {
        ...req.body,
        taskId: taskId,
        attachments: attachments,
      },
      userId,
    );

    // Create ProjectDocument entries for comment attachments (share with PM + Leader)
    if (attachments.length > 0) {
      try {
        const task = await Task.findById(taskId).lean();
        const project = task ? await Project.findById(task.projectId).lean() : null;

        if (task && project) {
          const sharedWith = project.members.filter((m) => m.role === "PROJECT_MANAGER" || m.role === "LEADER").map((m) => m.userId);

          await ProjectDocument.insertMany(
            attachments.map((att) => ({
              projectId: task.projectId,
              filename: att.filename,
              url: att.url,
              public_id: att.public_id,
              category: "other",
              version: "v1",
              tags: [],
              sourceType: "comment",
              parent: {
                commentId: comment._id,
                taskId: task._id,
                taskKey: task.key,
                taskName: task.name,
              },
              uploadedBy: userId,
              sharedWith,
              uploadedAt: new Date(),
            })),
          );
        }
      } catch (docError) {
        console.error("[CommentController] Failed to create ProjectDocument:", docError.message);
      }
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error("Error in handleCreateComment:", error);
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

const handleUpdateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const updatedComment = await commentService.updateComment(commentId, content, userId);
    res.status(200).json(updatedComment);
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const handleDeleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const result = await commentService.deleteComment(commentId, userId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
const handleToggleReaction = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    const updatedComment = await commentService.toggleReaction(commentId, userId, emoji);
    res.status(200).json(updatedComment);
  } catch (error) {
    console.error("Error toggling reaction:", error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = {
  handleGetComments,
  handleCreateComment,
  handleUpdateComment,
  handleDeleteComment,
  handleToggleReaction,
};
