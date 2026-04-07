const express = require("express");
const router = express.Router();
const SummaryController = require("../controllers/SummaryController");
const { protect } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/v1/meetings/:meetingId/generate-summary
 * @desc    Trigger summary generation
 * @access  Private
 */
router.post("/:meetingId/generate-summary", SummaryController.triggerSummaryGeneration);

/**
 * @route   GET /api/v1/meetings/:meetingId/summary/status
 * @desc    Get summary generation status
 * @access  Private
 */
router.get("/:meetingId/summary/status", SummaryController.getSummaryStatus);

/**
 * @route   GET /api/v1/meetings/:meetingId/summary
 * @desc    Get summary content
 * @access  Private
 */
router.get("/:meetingId/summary", SummaryController.getSummary);

/**
 * @route   GET /api/v1/meetings/:meetingId/summaries
 * @desc    List all summaries (versions)
 * @access  Private
 */
router.get("/:meetingId/summaries", SummaryController.listSummaries);

/**
 * @route   GET /api/v1/meetings/:meetingId/action-items
 * @desc    Get action items from summary
 * @access  Private
 */
router.get("/:meetingId/action-items", SummaryController.getActionItems);

/**
 * @route   POST /api/v1/action-items/:actionItemId/create-task
 * @desc    Create task from action item
 * @access  Private
 */
router.post("/:actionItemId/create-task", SummaryController.createTaskFromActionItem);

module.exports = router;
