const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  handleCreateTimeLog,
  handleGetTimeLogsByTask,
  handleUpdateTimeLog,
  handleDeleteTimeLog,
  handleGetTimeLogStats,
} = require("../controllers/TimeLogController");

// @route   POST /api/timelogs
// @desc    Create new time log
// @access  Private
router.post("/", protect, handleCreateTimeLog);

// @route   GET /api/timelogs/task/:taskId
// @desc    Get time logs by task
// @access  Private
router.get("/task/:taskId", protect, handleGetTimeLogsByTask);

// @route   GET /api/timelogs/stats
// @desc    Get user time log statistics
// @access  Private
router.get("/stats", protect, handleGetTimeLogStats);

// @route   PUT /api/timelogs/:timeLogId
// @desc    Update time log
// @access  Private
router.put("/:timeLogId", protect, handleUpdateTimeLog);

// @route   DELETE /api/timelogs/:timeLogId
// @desc    Delete time log
// @access  Private
router.delete("/:timeLogId", protect, handleDeleteTimeLog);

module.exports = router;
