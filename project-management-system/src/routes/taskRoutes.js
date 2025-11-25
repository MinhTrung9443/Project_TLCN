
const express = require("express");
const router = express.Router();
const {
  handleGetTasksByProjectKey,
  handleCreateTask,
  changeSprint,
  handleUpdateTaskStatus,
  handleSearchTasks,
  handleUpdateTask,
  handleDeleteTask,
  handleGetTaskHistory,
  handleAddAttachment,
  handleDeleteAttachment,
  handleLinkTask,
  handleUnlinkTask,
  getAvailableTaskStatuses,
} = require("../controllers/TaskController");
const { handleGetComments, handleCreateComment} = require("../controllers/CommentController");
const { protect , isProjectMember, isManagerOrLeader} = require("../middleware/authMiddleware"); 
const upload = require('../middleware/uploadMiddleware'); 

router.get("/search", protect, handleSearchTasks);
router.get("/project/:projectKey", protect, handleGetTasksByProjectKey);
router.post("/project/:projectKey", protect, isProjectMember, handleCreateTask);

router.put("/project/:projectKey/tasks/:taskId/change-sprint", protect, isManagerOrLeader, changeSprint);

router.get("/:taskId/available-statuses", protect,isProjectMember, getAvailableTaskStatuses);

router.put("/project/:projectKey/tasks/:taskId/update-status", protect, isProjectMember, handleUpdateTaskStatus);

router.patch("/project/:projectKey/tasks/:taskId", protect, isProjectMember, handleUpdateTask);
router.delete("/project/:projectKey/tasks/:taskId", protect, isManagerOrLeader, handleDeleteTask);
router.get("/:taskId/history", protect, handleGetTaskHistory);
router.get("/:taskId/comments", protect, handleGetComments);
router.post("/:taskId/comments", protect, handleCreateComment);

router.post('/:taskId/attachments', protect, upload.single('attachmentFile'), handleAddAttachment);
router.delete('/:taskId/attachments/:attachmentId',protect,handleDeleteAttachment);

router.post('/:taskId/links', protect, handleLinkTask);
router.delete('/:taskId/links/:linkId', protect, handleUnlinkTask);

module.exports = router;