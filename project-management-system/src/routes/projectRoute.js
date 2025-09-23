const express = require('express');
const router = express.Router();
const { handleCreateProject, handleGetAllProjects } = require('../controllers/ProjectController');
const { protect, isAdmin } = require('../middleware/authMiddleware'); 
router.get('/', protect, handleGetAllProjects);
router.post('/', protect, isAdmin, handleCreateProject);

module.exports = router;