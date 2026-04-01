const axios = require('axios');
const User = require('../models/User');

class GithubController {
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
            const stateObj = { userId, returnTo };
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
            
            try {
                const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
                userId = decodedState.userId;
                returnTo = decodedState.returnTo;
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
            // Ở đây frontend URL có trong biến môi trường FRONTEND_URL
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            
            // Redirect về trang lúc nãy theo returnTo với tham số github_link=success 
            res.redirect(`${frontendUrl}${returnTo}?github_link=success`);

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
}

module.exports = GithubController;
