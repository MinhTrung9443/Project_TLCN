const axios = require('axios');
const User = require('../models/User');

class GithubController {
    static buildFrontendRedirect(returnTo, params = {}) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const safeReturnTo = typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : '/';
        const redirectUrl = new URL(safeReturnTo, frontendUrl);

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                redirectUrl.searchParams.set(key, value);
            }
        });

        return redirectUrl.toString();
    }

    // GET /api/github/auth
    static async authorize(req, res) {
        try {
            // Frontend truyền userId lên để ta biết ai đang thực hiện liên kết
            const userId = req.query.userId;
            
            if (!userId) {
                return res.status(400).json({ message: 'Thiếu userId' });
            }

            const clientId = process.env.Client_ID;
            const redirectUri = `${process.env.PUBLIC_API_URL || 'http://localhost:8080'}/api/github/callback`;
            const scope = 'repo,user'; // Cần quyền repo để theo dõi, quản lý

            // Sử dụng state để mang theo userId và returnTo qua quá trình OAuth
            // Encode ra chuỗi base64 hoặc chuỗi JSON tùy ý. Để an toàn xử lý JSON encode:
            const returnTo = req.query.returnTo || '/';
            const purpose = req.query.purpose || '';
            const projectId = req.query.projectId || '';
            const stateObj = { userId, returnTo, purpose, projectId };
            const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

            // Chuyển hướng trình duyệt đến trang cấp quyền của GitHub
            const targetUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
            
            res.redirect(targetUrl);
        } catch (error) {
            console.error('Lỗi khi tạo URL authorize GitHub:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // GET /api/github/callback
    static async callback(req, res) {
        try {
            const { code, state } = req.query;
            let userId = "";
            let returnTo = "/";
            let purpose = "";
            let projectId = "";
            
            try {
                const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
                userId = decodedState.userId;
                returnTo = decodedState.returnTo;
                purpose = decodedState.purpose || "";
                projectId = decodedState.projectId || "";
            } catch(e) {
                return res.status(400).send("Trạng thái (state) gửi lên không khả dụng.");
            }

            if (!code || !userId) {
                return res.status(400).send('Lỗi: Không nhận được thông tin xác thực từ GitHub (Thiếu code hoặc state)');
            }

            const clientId = process.env.Client_ID;
            const clientSecret = process.env.Client_Secret;
            const redirectUri = `${process.env.PUBLIC_API_URL || 'http://localhost:8080'}/api/github/callback`;

            // Gọi API của GitHub để đổi code lấy access_token
            const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri
            }, {
                headers: {
                    Accept: 'application/json'
                }
            });

            const accessToken = tokenResponse.data.access_token;

            if (!accessToken) {
                console.error("Token response:", tokenResponse.data);
                return res.status(400).send('Không thể lấy access_token từ GitHub.');
            }

            const Project = require('../models/Project');

            if (purpose === 'create_branch' && projectId) {
                const project = await Project.findById(projectId);
                if (!project || !project.githubRepoName) {
                    return res.redirect(
                        GithubController.buildFrontendRedirect(returnTo, {
                            github_link: 'failed',
                            github_error: 'project_repo_missing'
                        })
                    );
                }

                try {
                    const repoResponse = await axios.get(`https://api.github.com/repos/${project.githubRepoName}`, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Accept: 'application/vnd.github+json'
                        }
                    });

                    const permissions = repoResponse.data.permissions || {};
                    if (!permissions.push && !permissions.admin) {
                        return res.redirect(
                            GithubController.buildFrontendRedirect(returnTo, {
                                github_link: 'failed',
                                github_error: 'no_repo_permission'
                            })
                        );
                    }
                } catch (repoError) {
                    return res.redirect(
                        GithubController.buildFrontendRedirect(returnTo, {
                            github_link: 'failed',
                            github_error: 'repo_not_accessible'
                        })
                    );
                }
            }

            // Gọi API GitHub lấy thông tin user xác nhận
            const userResponse = await axios.get('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            const githubId = userResponse.data.id.toString();

            // Cập nhật token và githubId vào database của người dùng
            await User.findByIdAndUpdate(userId, {
                githubId: githubId,
                githubAccessToken: accessToken
            });

            // Thành công, chuyển hướng người dùng về lại Frontend tại trang họ vừa rời đi.
            const redirectParams = { github_link: 'success' };
            if (purpose === 'create_branch') {
                redirectParams.github_action = 'create_branch';
            }

            res.redirect(GithubController.buildFrontendRedirect(returnTo, redirectParams));

        } catch (error) {
            console.error('Lỗi trong quá trình callback GitHub:', error.message);
            res.status(500).send('Lỗi máy chủ trong quá trình liên kết tài khoản GitHub.');
        }
    }

    // GET /api/github/repos
    static async getRepositories(req, res) {
        try {
            // Lấy user đăng nhập hiện tại từ authMiddleware
            const userId = req.user._id;
            const user = await User.findById(userId);

            if (!user || !user.githubAccessToken) {
                return res.status(403).json({ message: 'Tài khoản chưa được liên kết với GitHub.' });
            }

            // Gọi API GitHub lấy danh sách repos của user đó
            const response = await axios.get('https://api.github.com/user/repos?sort=updated&per_page=100', {
                headers: {
                    Authorization: `Bearer ${user.githubAccessToken}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            });

            // Map lại để trả về những field cần thiết
            const repos = response.data.map(repo => ({
                id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                html_url: repo.html_url,
                description: repo.description,
            }));

            res.status(200).json(repos);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách repo GitHub:', error.message);
            res.status(500).json({ message: 'Không thể lấy danh sách repository.' });
        }
    }

    // POST /api/github/link-repo
    static async linkRepository(req, res) {
        try {
            // Cần require model Project vì file này chưa có
            const Project = require('../models/Project');
            
            const { projectId, repoId, repoUrl, repoName } = req.body;

            if (!projectId || !repoId) {
                return res.status(400).json({ message: 'Vui lòng cung cấp projectId và repoId' });
            }

            // check quyen project ở đây nếu cần, cho đơn giản ta sẽ link thẳng
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ message: 'Không tìm thấy project' });
            }

            project.githubRepoId = repoId.toString();
            project.githubRepoUrl = repoUrl;
            project.githubRepoName = repoName;

            await project.save();

            res.status(200).json({ 
                message: 'Liên kết Repository thành công', 
                project 
            });

        } catch (error) {
            console.error('Lỗi khi liên kết repo vào project:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async createBranch(req, res) {
        try {
            const Project = require('../models/Project');
            const Task = require('../models/Task');
            
            const { projectId, taskId } = req.body;

            const token = req.user.githubAccessToken;
            if (!token) {
                return res.status(401).json({ message: 'Bạn chưa kết nối với tài khoản GitHub' });
            }

            const project = await Project.findById(projectId);
            if (!project || !project.githubRepoName) {
                return res.status(400).json({ message: 'Dự án chưa được liên kết với GitHub Repository' });
            }

            let repoRes;
            try {
                repoRes = await axios.get(
                    `https://api.github.com/repos/${project.githubRepoName}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: 'application/vnd.github+json'
                        }
                    }
                );
            } catch (repoError) {
                const repoStatus = repoError.response?.status;
                if (repoStatus === 404) {
                    return res.status(403).json({ message: 'Tài khoản GitHub của bạn không có quyền truy cập repository này' });
                }

                throw repoError;
            }

            const repoPermissions = repoRes.data.permissions || {};
            if (!repoPermissions.push && !repoPermissions.admin) {
                return res.status(403).json({ message: 'Tài khoản GitHub của bạn không có quyền tạo nhánh trên repository này' });
            }

            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({ message: 'Không tìm thấy Task' });
            }

            if (task.githubBranch) {
                return res.status(400).json({ message: 'Task này đã có nhánh GitHub', branch: task.githubBranch });
            }

            const repoFullName = project.githubRepoName; // VD: owner/repo
            console.log(`[GithubController] Creating branch for repo: ${repoFullName}`);

            // Lấy thông tin default branch (thường là main)
            const defaultBranchRes = await axios.get(
                `https://api.github.com/repos/${repoFullName}`,
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
            );
            const defaultBranch = defaultBranchRes.data.default_branch || 'main';

            // Lấy SHA của nhánh mặc định
            const refRes = await axios.get(
                `https://api.github.com/repos/${repoFullName}/git/refs/heads/${defaultBranch}`,
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
            );
            const sha = refRes.data.object.sha;

            // Xử lý loại bỏ dấu tiếng Việt để tên nhánh đẹp hơn
            const removeVietnameseTones = (str) => {
                return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
            };
            const formatTitle = removeVietnameseTones(task.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            const newBranchName = `tasks/${task.key}-${formatTitle}`;

            // Gửi request tạo nhánh
            try {
                await axios.post(
                    `https://api.github.com/repos/${repoFullName}/git/refs`,
                    {
                        ref: `refs/heads/${newBranchName}`,
                        sha: sha
                    },
                    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
                );
            } catch (gitError) {
                // Nếu lỗi do nhánh đã tồn tại
                if (gitError.response?.data?.message === 'Reference already exists') {
                    // Cập nhật DB luôn và giả lập thành công
                    task.githubBranch = newBranchName;
                    await task.save();

                    const TaskHistory = require('../models/TaskHistory');
                    await TaskHistory.create({
                        taskId: task._id,
                        userId: req.user._id,
                        fieldName: 'githubBranch',
                        oldValue: null,
                        newValue: newBranchName,
                        actionType: 'LINK_GITHUB_BRANCH'
                    });

                    return res.status(200).json({ 
                        message: 'Nhánh này đã có sẵn trên GitHub, đã đồng bộ thành công!',
                        branch: newBranchName,
                        url: `https://github.com/${repoFullName}/tree/${newBranchName}`
                    });
                }
                throw gitError; // Các lỗi khác thì ném ra ngoài catch to
            }

            // Lưu tên nhánh vào DB để frontend hiển thị lại
            task.githubBranch = newBranchName;
            await task.save();

            // GHI LỊCH SỬ VÀO TASK HISTORY
            const TaskHistory = require('../models/TaskHistory');
            await TaskHistory.create({
                taskId: task._id,
                userId: req.user._id,
                fieldName: 'githubBranch',
                oldValue: null,
                newValue: newBranchName,
                actionType: 'CREATE_GITHUB_BRANCH'
            });

            res.status(200).json({ 
                message: 'Tạo nhánh GitHub thành công',
                branch: newBranchName,
                url: `https://github.com/${repoFullName}/tree/${newBranchName}`
            });

        } catch (error) {
            console.error('Lỗi tạo nhánh GitHub:', error.response?.data || error.message);
            // Gửi thẳng error.message từ Github về Frontend (nếu có)
            const githubErrorMsg = error.response?.data?.message;
            res.status(500).json({ 
                message: githubErrorMsg ? `Lỗi Github: ${githubErrorMsg}` : 'Lỗi khi kết nối đến GitHub API để tạo nhánh', 
                error: githubErrorMsg || error.message 
            });
        }
    }
}

module.exports = GithubController;
