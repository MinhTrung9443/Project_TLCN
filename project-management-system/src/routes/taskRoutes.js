const express = require('express');
const router = express.Router();
const { handleGetTasksByProjectKey, handleCreateTask } = require('../controllers/TaskController');
const { protect } = require('../middleware/authMiddleware');

router.get('/project/:projectKey', protect, handleGetTasksByProjectKey);

router.post('/', protect, handleCreateTask);

module.exports = router;