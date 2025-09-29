const express = require('express');
const router = express.Router();
const { getCreateTaskFormData } = require('../controllers/SettingsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/create-task-form/:projectKey', protect, getCreateTaskFormData);

module.exports = router;