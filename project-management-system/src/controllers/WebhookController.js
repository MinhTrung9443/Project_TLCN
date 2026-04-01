const Task = require('../models/Task');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');

const handleGithubPushEvent = async (req, res) => {
    try {
        const payload = req.body;
        // Lấy commit gần nhất
        const latestCommit = payload.commits && payload.commits[0];

        if (!latestCommit) {
            return res.status(200).send('No commits found in payload.');
        }

        const commitMessage = latestCommit.message;
        const commitUrl = latestCommit.url;
        const author = latestCommit.author.name;

        // Sử dụng Regex để tìm Task ID, ví dụ: #TASK-123
        const taskIdRegex = /#TASK-(\w+)/;
        const match = commitMessage.match(taskIdRegex);

        if (!match) {
            return res.status(200).send('Commit message does not contain a task ID.');
        }

        const taskShortId = match[0]; // Sẽ là #TASK-123
        const task = await Task.findOne({ shortId: taskShortId });

        if (!task) {
            console.log(`Task with shortId ${taskShortId} not found.`);
            return res.status(404).send(`Task with shortId ${taskShortId} not found.`);
        }

        // Tạo comment mới
        const newComment = new Comment({
            content: `Đã commit bởi **${author}**: [${commitMessage}](${commitUrl})`,
            task: task._id,
            author: null, // Có thể gán 1 user hệ thống nếu cần
            isSystemComment: true
        });

        await newComment.save();

        // Thêm comment vào task
        task.comments.push(newComment._id);
        
        // (Nâng cao) Tự động chuyển trạng thái
        // Giả sử bạn có một trạng thái là "In Review"
        // Bạn cần tìm ID của trạng thái này trong DB của bạn
        // const reviewStatusId = 'ID_CUA_TRANG_THAI_IN_REVIEW'; 
        // if(task.status.toString() !== reviewStatusId) {
        //     task.status = reviewStatusId;
        // }

        await task.save();

        console.log(`Added comment to task ${taskShortId} for new commit.`);
        res.status(200).json({ message: 'Webhook processed successfully.' });

    } catch (error) {
        console.error('Error processing GitHub webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    handleGithubPushEvent,
};
