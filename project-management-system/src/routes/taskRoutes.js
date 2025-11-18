
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
} = require("../controllers/TaskController");
const { handleGetComments, handleCreateComment} = require("../controllers/CommentController");
const { protect, isAdmin } = require("../middleware/authMiddleware"); 
const upload = require('../middleware/uploadMiddleware'); 

router.get("/search", protect, handleSearchTasks);
router.get("/project/:projectKey", protect, handleGetTasksByProjectKey);
router.post("/", protect, handleCreateTask);

router.put("/change-sprint/:taskId", protect, isAdmin, changeSprint);
router.put("/update-status/:taskId", protect, handleUpdateTaskStatus);

router.patch("/:taskId", protect, handleUpdateTask);
router.delete("/:taskId", protect, handleDeleteTask);
router.get("/:taskId/history", protect, handleGetTaskHistory);
router.get("/:taskId/comments", protect, handleGetComments);
router.post("/:taskId/comments", protect, handleCreateComment);

router.post('/:taskId/attachments', protect, upload.single('attachmentFile'), handleAddAttachment);
router.delete('/:taskId/attachments/:attachmentId',protect,handleDeleteAttachment);

router.post('/:taskId/links', protect, handleLinkTask);
router.delete('/:taskId/links/:linkId', protect, handleUnlinkTask);

module.exports = router;