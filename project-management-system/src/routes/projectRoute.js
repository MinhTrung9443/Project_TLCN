const express = require('express');
const router = express.Router();
const { handleCreateProject, handleGetAllProjects,handleUpdateProject,handleDeleteProject,handleCloneProject, handleGetProjectByKey,handleGetProjectMembers, handleAddMemberToProject, handleAddGroupToProject} = require('../controllers/ProjectController');
const { protect, isAdmin } = require('../middleware/authMiddleware'); 

router.get('/', protect, handleGetAllProjects);
router.post('/', protect, isAdmin, handleCreateProject);
router.put('/:id', protect, isAdmin, handleUpdateProject);
router.delete('/:id', protect, isAdmin, handleDeleteProject);
router.post('/:id/clone', protect, isAdmin, handleCloneProject);
router.get('/key/:key', protect, handleGetProjectByKey);
router.get('/key/:key/members', protect, handleGetProjectMembers);
router.post('/key/:key/members', protect, isAdmin, handleAddMemberToProject);
router.post('/key/:key/groups', protect, isAdmin, handleAddGroupToProject);

module.exports = router;