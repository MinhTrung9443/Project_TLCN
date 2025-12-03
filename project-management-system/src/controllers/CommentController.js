const commentService = require("../services/CommentService");

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

    const comment = await commentService.createComment(
      {
        ...req.body,
        taskId: taskId,
        attachments: attachments,
      },
      userId
    );

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
