const express = require("express");
const router = express.Router();
const sprintControlelr = require("../controllers/SprintController.js");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.get("/:projectKey", protect, sprintControlelr.handleGetSprintsByProjectKey);
router.post("/:projectKey", protect, isAdmin, sprintControlelr.handleCreateSprint);
router.put("/:sprintId", protect, isAdmin, sprintControlelr.handleUpdateSprint);
router.delete("/:sprintId", protect, isAdmin, sprintControlelr.handleDeleteSprint);

// New routes for active sprint page
router.get("/:projectKey/started", protect, sprintControlelr.handleGetStartedSprints);
router.get("/tasks/:sprintId", protect, sprintControlelr.handleGetTasksBySprintWithStatus);

module.exports = router;
