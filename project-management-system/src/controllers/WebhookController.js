const Task = require('../models/Task');
const Project = require('../models/Project');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');

const handleGithubPushEvent = async (req, res) => {
    try {
        const payload = req.body;
        
        if (!payload) {
             return res.status(400).send('Payload rỗng');
        }

        // 1. Xác minh Repository có nằm trong hệ thống của chúng ta không?
        const repoId = payload.repository?.id?.toString();
        if (!repoId) {
            console.log("[Webhook] Payload không chứa thông tin repository:", payload);
            return res.status(200).send('Không tìm thấy thông tin repository từ GitHub webhook (Có thể là PING event).');
        }

        const project = await Project.findOne({ githubRepoId: repoId });
        if (!project) {
            console.log(`[Webhook] Bỏ qua: Repository ID ${repoId} chưa được liên kết với bất kỳ Project nào.`);
            return res.status(200).send('Repository không thuộc quyền quản lý của hệ thống.');
        }

        // Tìm User trong DB của chúng ta bằng githubId nằm trong payload
        const User = require('../models/User');
        const senderGithubId = payload.sender?.id?.toString();
        let authorUser = null;
        if (senderGithubId) {
            authorUser = await User.findOne({ githubId: senderGithubId });
        }
        
        // Nếu không tìm thấy, ta dùng User mặc định là Project Manager hoặc lấy 1 Admin
        if (!authorUser) {
            authorUser = await User.findOne({ role: 'admin' }) || await User.findOne();
        }

        // 2. Lấy danh sách các commits mới nhất
        const commits = payload.commits;
        if (!commits || commits.length === 0) {
            return res.status(200).send('Không có commit nào trong payload.');
        }

        // 3. Quét từng commit để tìm mã Task dự án (Ví dụ project.key là "PROJ", ta tìm "PROJ-123")
        // Regex này tự động build theo cái Prefix "key" của Project
        const taskKeyRegex = new RegExp(`${project.key}-\\d+`, 'gi');
        
        let processedTasksCount = 0;

        for (const commit of commits) {
            const commitMessage = commit.message;
            const commitUrl = commit.url;
            const author = commit.author?.name || 'Unknown';

            const matches = commitMessage.match(taskKeyRegex);
            
            if (matches) {
                // Loại bỏ những từ trùng lặp nếu người lập trình dùng mã này nhiều lần trong 1 commit message
                const uniqueTaskKeys = [...new Set(matches.map(k => k.toUpperCase()))];

                for (const taskKey of uniqueTaskKeys) {
                    // Tìm Task trong DataBase dựa theo Key
                    const task = await Task.findOne({ key: taskKey });

                    if (task) {
                        // Thêm một comment hệ thống xịn xò với Markdown
                        const newComment = new Comment({
                            content: `🔄 **[GitHub Tự động]** Code mới đã được đẩy lên bởi **${author}**.\n\n📝 **Ghi chú commit:** \`${commitMessage}\`\n\n🔗 [👉 Bấm vào đây để xem trực tiếp trên GitHub](${commitUrl})`,
                            taskId: task._id,
                            userId: authorUser ? authorUser._id : null
                        });

                        await newComment.save();

                        // Thêm comment vào Task nếu Task Schema có chứa mảng comments
                        if (task.comments) {
                            task.comments.push(newComment._id);
                        }
                        
                        await task.save();
                        processedTasksCount++;
                        console.log(`[Webhook] Đã tự động cập nhật Task: ${taskKey}`);
                    }
                }
            }
        }

        res.status(200).json({ message: `Webhook xử lý thành công. Đã cập nhật bình luận cho ${processedTasksCount} task.` });

    } catch (error) {
        console.error('Error processing GitHub webhook:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
};

module.exports = {
    handleGithubPushEvent,
};
