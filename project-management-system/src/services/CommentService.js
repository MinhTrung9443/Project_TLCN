const Comment = require('../models/Comment');
const { logHistory } = require('./HistoryService');

const getCommentsByTaskId = async (taskId) => {
    return Comment.find({ taskId: taskId, userId: { $exists: true, $ne: null } })
        .populate('userId', 'fullname avatar')
        .sort({ createdAt: 'asc' });
}

const createComment = async (commentData, userId) => {
    const newComment = new Comment({
        ...commentData,
        userId
    });
    await newComment.save();
    
    await logHistory(commentData.taskId, userId, "Comment", null, newComment.content, "COMMENT");

    return newComment.populate('userId', 'fullname avatar');
}


module.exports = { getCommentsByTaskId, createComment };
