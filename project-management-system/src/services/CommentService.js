const Comment = require("../models/Comment");
const { logHistory } = require("./HistoryService");

const getCommentsByTaskId = async (taskId) => {
  return Comment.find({ taskId: taskId, userId: { $exists: true, $ne: null } })
    .populate("userId", "fullname avatar")
    .sort({ createdAt: "asc" });
};

const createComment = async (commentData, userId) => {
  const newComment = new Comment({
    ...commentData,
    userId,
  });
  await newComment.save();

  await logHistory(commentData.taskId, userId, "Comment", null, newComment.content, "COMMENT");

  return newComment.populate("userId", "fullname avatar");
};

const updateComment = async (commentId, content, userId) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new Error("Comment not found");

  if (comment.userId.toString() !== userId.toString()) {
    const error = new Error("Not authorized to edit this comment");
    error.statusCode = 403; // Forbidden
    throw error;
  }

  comment.content = content;
  await comment.save();
  return comment.populate("userId", "fullname avatar");
};

const deleteComment = async (commentId, userId) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new Error("Comment not found");

  if (comment.userId.toString() !== userId.toString()) {
    const error = new Error("Not authorized to delete this comment");
    error.statusCode = 403;
    throw error;
  }

  const deletedComment = await Comment.findByIdAndDelete(commentId);
  if (!deletedComment) {
    const error = new Error("Comment not found");
    error.statusCode = 404;
    throw error;
  }
  // Cũng có thể xóa các comment con nếu cần
  // await Comment.deleteMany({ parentId: commentId });
  return { message: "Comment deleted successfully" };
};

const toggleReaction = async (commentId, userId, emoji) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new Error("Comment not found");

  const reactionIndex = comment.reactions.findIndex((r) => r.userId.toString() === userId.toString() && r.emoji === emoji);

  if (reactionIndex > -1) {
    // Nếu đã react, xóa nó đi (toggle off)
    comment.reactions.splice(reactionIndex, 1);
  } else {
    // Nếu chưa, thêm vào (toggle on)
    comment.reactions.push({ userId, emoji });
  }

  await comment.save();
  return comment.populate("userId", "fullname avatar");
};

module.exports = {
  getCommentsByTaskId,
  createComment,
  updateComment,
  deleteComment,
  toggleReaction,
};
