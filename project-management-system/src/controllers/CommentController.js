
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
    const comment = await commentService.createComment({ ...req.body, taskId: taskId }, userId);
    res.status(201).json(comment);
  } catch (error) {
    console.error("Error in handleCreateComment:", error);
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

module.exports = {
  handleGetComments,
  handleCreateComment,
};