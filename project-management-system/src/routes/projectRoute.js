
const express = require('express');
const router = express.Router();

const {
  // Admin handlers
  handleCreateProject,
  handleCloneProject,
  handleGetArchivedProjects,
  handleRestoreProject,
  handlePermanentlyDeleteProject,
  // Project Manager handlers
  handleUpdateProjectByKey,
  handleArchiveProjectByKey,
  handleAddMemberToProject,
  handleAddGroupToProject, 
  // Member handlers
  handleGetAllProjects,
  handleGetProjectByKey,
  handleGetProjectMembers,
  handleRemoveMember,
  handleRemoveTeam,
  handleChangeMemberRole,
  handleChangeTeamLeader,
} = require('../controllers/ProjectController');

const {
  protect,
  admin,
  isProjectManager,
  isProjectMember,
} = require('../middleware/authMiddleware');


// ===============================================
// === 1. CÁC HÀNH ĐỘNG CỦA ADMIN HỆ THỐNG ===
// ===============================================
// -----------------------------------------------
router.post('/', protect, admin, handleCreateProject);
router.get('/archived', protect, admin, handleGetArchivedProjects);
router.post('/:id/clone', protect, admin, handleCloneProject);
router.put('/:id/restore', protect, admin, handleRestoreProject);
router.delete('/:id/permanent', protect, admin, handlePermanentlyDeleteProject);


// ===============================================
// === 2. CÁC HÀNH ĐỘNG CỦA PROJECT MANAGER ===
// ===============================================
// -----------------------------------------------
router.put('/key/:projectKey', protect, isProjectManager, handleUpdateProjectByKey);
router.delete('/key/:projectKey/archive', protect, isProjectManager, handleArchiveProjectByKey);
router.post('/key/:projectKey/members', protect, isProjectManager, handleAddMemberToProject);
router.post('/key/:projectKey/add-from-group', protect, isProjectManager, handleAddGroupToProject);


router.get('/', protect, handleGetAllProjects);

router.get('/key/:projectKey', protect, isProjectMember, handleGetProjectByKey);
// Xem danh sách thành viên của dự án (phải là thành viên)
router.get('/key/:projectKey/members', protect, isProjectMember, handleGetProjectMembers);

router.put('/key/:projectKey/members/:userId/role', protect, isProjectManager, handleChangeMemberRole);

// 4. Thay đổi Leader của một Team
router.put('/key/:projectKey/teams/:teamId/leader', protect, isProjectManager, handleChangeTeamLeader);

router.delete('/key/:projectKey/members/:userId', protect, isProjectManager, handleRemoveMember);

// 2. Xóa Team khỏi Dự án
router.delete('/key/:projectKey/teams/:teamId', protect, isProjectManager, handleRemoveTeam);

module.exports = router;