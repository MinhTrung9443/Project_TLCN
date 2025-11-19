
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


// =========================================================
// === 3. CÁC HÀNH ĐỘNG CỦA MỌI THÀNH VIÊN TRONG DỰ ÁN ===
// =========================================================
// Middleware: 'isProjectMember' hoặc chỉ 'protect'
// ---------------------------------------------------------
// Lấy danh sách các dự án mà người dùng này là thành viên
router.get('/', protect, handleGetAllProjects);
// Xem chi tiết dự án (phải là thành viên)
router.get('/key/:projectKey', protect, isProjectMember, handleGetProjectByKey);
// Xem danh sách thành viên của dự án (phải là thành viên)
router.get('/key/:projectKey/members', protect, isProjectMember, handleGetProjectMembers);

// Dòng code trùng lặp ở file cũ của bạn, đã được xóa
router.get('/:key/members', protect,isProjectManager, handleGetProjectMembers); 

module.exports = router;