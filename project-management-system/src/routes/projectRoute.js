const express = require("express");
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
  handleGetProjectById,
  handleGetProjectMembers,
  handleGetProjectDetails,
  handleRemoveMember,
  handleRemoveTeam,
  handleChangeMemberRole,
  handleChangeTeamLeader,
  handleAddMemberToTeam,
  handleRemoveMemberFromTeam,
} = require("../controllers/ProjectController");
const ProjectDocumentController = require("../controllers/ProjectDocumentController");

const { protect, admin, isProjectManager, isProjectMember } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// ===============================================
// === 1. CÁC HÀNH ĐỘNG CỦA ADMIN HỆ THỐNG ===
// ===============================================
// -----------------------------------------------
router.post("/", protect, admin, handleCreateProject);
router.get("/archived", protect, admin, handleGetArchivedProjects);
router.post("/:id/clone", protect, admin, handleCloneProject);
router.put("/:id/restore", protect, admin, handleRestoreProject);
router.delete("/:id/permanent", protect, admin, handlePermanentlyDeleteProject);

// ===============================================
// === 2. CÁC HÀNH ĐỘNG CỦA PROJECT MANAGER ===
// ===============================================
// -----------------------------------------------
router.put("/key/:projectKey", protect, isProjectManager, handleUpdateProjectByKey);
router.delete("/key/:projectKey/archive", protect, isProjectManager, handleArchiveProjectByKey);
router.post("/key/:projectKey/members", protect, isProjectManager, handleAddMemberToProject);
router.post("/key/:projectKey/add-from-group", protect, isProjectManager, handleAddGroupToProject);

// Xem danh sách thành viên của dự án (phải là thành viên)
router.get("/key/:projectKey/members", protect, isProjectMember, handleGetProjectMembers);
router.get("/", protect, handleGetAllProjects);

router.get("/key/:projectKey/details", protect, isProjectMember, handleGetProjectDetails);
router.get("/key/:projectKey", protect, isProjectMember, handleGetProjectByKey);
router.get("/:id", protect, handleGetProjectById);

// Project Documents (upload-only)
router.get("/key/:projectKey/documents", protect, isProjectMember, ProjectDocumentController.listDocuments);
router.post("/key/:projectKey/documents", protect, isProjectMember, upload.single("file"), ProjectDocumentController.uploadDocument);
router.delete("/key/:projectKey/documents/:documentId", protect, isProjectMember, ProjectDocumentController.deleteDocument);

router.put("/key/:projectKey/members/:userId/role", protect, isProjectManager, handleChangeMemberRole);

router.put("/key/:projectKey/teams/:teamId/leader", protect, isProjectManager, handleChangeTeamLeader);

router.delete("/key/:projectKey/members/:userId", protect, isProjectManager, handleRemoveMember);
router.delete("/key/:projectKey/teams/:teamId", protect, isProjectManager, handleRemoveTeam);
router.post("/key/:projectKey/teams/:teamId/members", protect, isProjectManager, handleAddMemberToTeam);
router.delete("/key/:projectKey/teams/:teamId/members/:userId", protect, isProjectManager, handleRemoveMemberFromTeam);

module.exports = router;
