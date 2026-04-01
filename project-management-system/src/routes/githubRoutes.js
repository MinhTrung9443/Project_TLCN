const express = require('express');
const router = express.Router();
const GithubController = require('../controllers/GithubController');
const authMiddleware = require('../middleware/authMiddleware'); // Import middleware

// Khởi tạo luồng OAuth
router.get('/auth', GithubController.authorize);

// Nhận callback từ GitHub
router.get('/callback', GithubController.callback);

// Lấy danh sách repository
router.get('/repos', authMiddleware.protect, GithubController.getRepositories);

// Liên kết project với repo
router.post('/link-repo', authMiddleware.protect, GithubController.linkRepository);

module.exports = router;
