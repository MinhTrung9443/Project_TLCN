const Task = require('../models/Task');
const Project = require('../models/Project');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const { logHistory } = require('../services/HistoryService');

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

        const projects = await Project.find({ githubRepoId: repoId });
        if (!projects || projects.length === 0) {
            console.log(`[Webhook] Bỏ qua: Repository ID ${repoId} chưa được liên kết với Project nào.`);
            return res.status(200).send('Repository không thuộc quyền quản lý của hệ thống.');
        }

        // Tạo tài khoản "Hệ thống" (Bot) để đại diện cho việc comment/history tự động
        const User = require('../models/User');
        let authorUser = await User.findOne({ email: 'github-bot@system.local' });
        
        // Link avatar chính thức của Bot (biểu tượng robot/GitHub)
        const botAvatarUrl = 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png';

        // Nếu data chưa có tài khoản bot này (chạy Webhook lần đầu), tự động tạo 1 lần duy nhất
        if (!authorUser) {
            authorUser = new User({
                username: 'github_bot_system_' + Date.now().toString().slice(-5),
                email: 'github-bot@system.local',
                password: 'SystemBotPassword123!',
                fullname: 'Trợ lý GitHub',
                avatar: botAvatarUrl,
                role: 'user', // Có thể để user bình thường
                status: 'active'
            });
            await authorUser.save();
        } else if (authorUser.avatar !== botAvatarUrl) {
            // Fix trường hợp tạo từ lần trước nhưng chưa gán avatar
            authorUser.avatar = botAvatarUrl;
            authorUser.fullname = 'Trợ lý GitHub'; // Lấy tên gọn gàng hơn
            await authorUser.save();
        }

        let processedTasksCount = 0;

        // Xây dựng regex cho tất cả các Project được cấu hình với repo này
        const projectMap = new Map();
        const regexList = [];
        projects.forEach(project => {
            projectMap.set(project._id.toString(), project);
            // gom regex của từng project (ví dụ: PN-\d+ và A-C-\d+)
            regexList.push(new RegExp(`${project.key}-\\d+`, 'gi'));
        });

        // --- 2. XỬ LÝ SỰ KIỆN PULL REQUEST ---
        if (payload.pull_request) {
            const action = payload.action;
            const isMerged = payload.pull_request.merged;
            
            // Chỉ bắt sự kiện khi định dạng hành động PR đã bị Close và Trạng thái là Merged
            if (action === 'closed' && isMerged) {
                const branchName = payload.pull_request.head.ref;
                const prUrl = payload.pull_request.html_url;
                const prTitle = payload.pull_request.title;
                const author = payload.sender?.login || 'Unknown';
                const prBody = payload.pull_request.body || '';

                const foundTasksMap = new Map();
                
                // Mở rộng mapping 1: Tìm theo branch nằm trong Task DB thuộc các project
                const tasksByBranch = await Task.find({ githubBranch: branchName, projectId: { $in: Array.from(projectMap.keys()) } });
                tasksByBranch.forEach(t => foundTasksMap.set(t._id.toString(), t));

                // Mở rộng mapping 2: Tìm theo text mã Task ID trong PR (Tiêu đề PR + Nội dung)
                const uniqueTaskKeys = new Set();
                const prText = prTitle + " " + prBody;
                regexList.forEach(regex => {
                    const matches = prText.match(regex);
                    if (matches) matches.forEach(k => uniqueTaskKeys.add(k.toUpperCase()));
                });
                
                if (uniqueTaskKeys.size > 0) {
                    const tasksByKey = await Task.find({ key: { $in: Array.from(uniqueTaskKeys) }, projectId: { $in: Array.from(projectMap.keys()) } });
                    tasksByKey.forEach(t => foundTasksMap.set(t._id.toString(), t));
                }

                for (const task of foundTasksMap.values()) {
                    // Check if we already commented this PR merge to avoid duplicates
                    const existingPrComment = await Comment.findOne({
                        taskId: task._id,
                        content: { $regex: prUrl }
                    });
                    if (existingPrComment) {
                        continue;
                    }

                    const content = `✅ **[GitHub Tự động]** Code từ nhánh làm việc đã được **merge** vào dự án bởi **${author}**.\n\n📌 **Tiêu đề PR:** \`${prTitle}\`\n🔀 **Branch:** \`${branchName}\`\n\n🔗 [👉 Nhấp vào đây để xem chi tiết Pull Request trên GitHub](${prUrl})`;
                    
                    const newComment = new Comment({
                        content: content,
                        taskId: task._id,
                        userId: authorUser ? authorUser._id : null
                    });
                    
                    await newComment.save();
                    
                    // Ghi lịch sử cho hành động comment PR
                    if (authorUser) {
                        await logHistory(task._id, authorUser._id, "Comment", null, newComment.content, "COMMENT");
                    }

                    if (task.comments) {
                        task.comments.push(newComment._id);
                    }
                    await task.save();
                    processedTasksCount++;
                    console.log(`[Webhook] Đã thêm comment sự kiện Merged PR cho Task: ${task.key}`);
                }
            } // END if(action === 'closed' && isMerged)
            
            // Log for debugging inside PR event
            console.log(`[Webhook] Sự kiện PR (action: ${action}, merged: ${isMerged}). Đi tiếp để bắt sự kiện Push nếu có.`);
            // Chúng ta không return ở đây, vì nếu GitHub gộp payload, ta vẫn muốn check Push ở dưới.
            if (processedTasksCount > 0) {
                 return res.status(200).json({ message: `Webhook xử lý PR thành công. Đã cập nhật ${processedTasksCount} task.` });
            }
        } // END payload.pull_request

        // --- 3. XỬ LÝ SỰ KIỆN PUSH (COMMITS) ---
        const commits = payload.commits;
        let pushProcessed = false;
        
        if (commits && commits.length > 0) {
            console.log(`[Webhook] Bắt đầu quét ${commits.length} commits...`);
            
            // Lấy tên nhánh từ ref (VD: "refs/heads/feature/task-1" -> "feature/task-1")
            let pushedBranchName = null;
            if (payload.ref && payload.ref.startsWith('refs/heads/')) {
                pushedBranchName = payload.ref.replace('refs/heads/', '');
                console.log(`[Webhook] -> Nhánh được push code: ${pushedBranchName}`);
            }

            for (const commit of commits) {
                const commitMessage = commit.message;
                const commitUrl = commit.url;
                const author = commit.author?.name || 'Unknown';

                console.log(`[Webhook] Quét commit: "${commitMessage}"`);
                
                // Mảng chứa các Task cần update từ cả 2 nguồn: regex trong message và cấu hình branch
                const taskKeysToUpdate = new Set();

                // Nguồn 1: Quét mã Task trong commit message
                regexList.forEach(regex => {
                    const matches = commitMessage.match(regex);
                    if (matches) matches.forEach(k => taskKeysToUpdate.add(k.toUpperCase()));
                });

                // Nếu bạn code theo chuẩn "1 Task = 1 Nhánh riêng":
                // Tự động nhận diện mọi commit push vào nhánh này đều thuộc về Task đó, 
                // không cần ép Dev phải gõ mã Task vào commit message nữa.
                if (pushedBranchName) {
                    // Nguồn 2: Tra cứu database xem nhánh này thuộc về Task nào
                    const projectIdsList = Array.from(projectMap.keys());
                    const tasksByBranch = await Task.find({ githubBranch: pushedBranchName, projectId: { $in: projectIdsList } });
                    tasksByBranch.forEach(t => taskKeysToUpdate.add(t.key));

                    // Nguồn 3 (Bảo hiểm bổ sung): Quét luôn mã Task nằm NHúng trong cái Tên Nhánh 
                    // Ví dụ tên nhánh là: "tasks/PN-3-khoi-tao-..." -> Tự lấy ra chữ PN-3
                    regexList.forEach(regex => {
                        const branchMatches = pushedBranchName.match(regex);
                        if (branchMatches) branchMatches.forEach(k => taskKeysToUpdate.add(k.toUpperCase()));
                    });
                }

                if (taskKeysToUpdate.size > 0) {
                    console.log(`[Webhook] -> Các Task sẽ được cập nhật commit này:`, Array.from(taskKeysToUpdate));

                    for (const taskKey of taskKeysToUpdate) {
                        const task = await Task.findOne({ key: taskKey, projectId: { $in: Array.from(projectMap.keys()) } });

                        if (task) {
                            console.log(`[Webhook] -> Đã tìm thấy Task trong DB: ${taskKey}`);
                            const existingComment = await Comment.findOne({
                                taskId: task._id,
                                content: { $regex: commitUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
                            });
                            
                            if (existingComment) {
                                console.log(`[Webhook] -> Bỏ qua commit ${commitUrl} vì trùng lặp (đã có comment).`);
                                continue; // Skip to next key
                            }

                            const content = `🔄 **[GitHub Tự động]** Code mới đã được đẩy lên bởi **${author}**.\n\n📝 **Ghi chú commit:** \`${commitMessage}\`\n\n🔗 [👉 Bấm vào đây để xem trực tiếp trên GitHub](${commitUrl})`;
                            
                            const newComment = new Comment({
                                content: content,
                                taskId: task._id,
                                userId: authorUser ? authorUser._id : null
                            });

                            await newComment.save();

                            if (authorUser) {
                                await logHistory(task._id, authorUser._id, "Comment", null, newComment.content, "COMMENT");
                            }

                            if (task.comments) {
                                task.comments.push(newComment._id);
                            }
                            
                            await task.save();
                            processedTasksCount++;
                            pushProcessed = true;
                            console.log(`[Webhook] -> Đã CẬP NHẬT THÀNH CÔNG Task: ${taskKey}`);
                        } else {
                            console.log(`[Webhook] -> KHÔNG tìm thấy Task ${taskKey} thuộc về bất kỳ Project nào đã liên kết trong Database.`);
                        }
                    } // end for taskKeys
                } else {
                    console.log(`[Webhook] -> Commit này không chứa mã Task và không thuộc nhánh đã liên kết. Bỏ qua.`);
                }
            } // end for commit
            
            if (processedTasksCount > 0) {
                 return res.status(200).json({ message: `Webhook xử lý thành công. Đã cập nhật ${processedTasksCount} task.` });
            } else {
                 return res.status(200).json({ message: `Webhook nhận thành công nhưng KHÔNG CÓ task nào được cập nhật. Hãy xem log Backend.` });
            }
        }

        res.status(200).send('Không có sự kiện hợp lệ cần xử lý hoặc không có commit.');

    } catch (error) {
        console.error('Error processing GitHub webhook:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
};

module.exports = {
    handleGithubPushEvent,
};
