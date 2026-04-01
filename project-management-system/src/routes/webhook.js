const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/WebhookController');

// Endpoint để nhận sự kiện từ GitHub
router.post('/github', webhookController.handleGithubPushEvent);

module.exports = router;
