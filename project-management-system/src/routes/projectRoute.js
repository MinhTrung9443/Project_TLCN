const express = require('express');
const router = express.Router();
const { handleCreateProject, handleGetAllProjects,handleUpdateProject,handleDeleteProject,handleCloneProject} = require('../controllers/ProjectController');
const { protect, isAdmin } = require('../middleware/authMiddleware'); 

router.get('/', protect, handleGetAllProjects);
router.post('/', protect, isAdmin, handleCreateProject);
router.put('/:id', protect, isAdmin, handleUpdateProject);
router.delete('/:id', protect, isAdmin, handleDeleteProject);
router.post('/:id/clone', protect, isAdmin, handleCloneProject);
module.exports = router;