const express = require("express");
const router = express.Router();
const sprintControlelr = require("../controllers/SprintController.js");
const { protect, admin, isProjectManager, isSprintManager } = require("../middleware/authMiddleware");

router.get("/:projectKey", protect, sprintControlelr.handleGetSprintsByProjectKey);
router.post("/:projectKey", protect, isProjectManager, sprintControlelr.handleCreateSprint);
router.put("/:sprintId", protect, isSprintManager, sprintControlelr.handleUpdateSprint);
router.delete("/:sprintId", protect, isSprintManager, sprintControlelr.handleDeleteSprint);

// New routes for active sprint page
router.get("/:projectKey/started", protect, sprintControlelr.handleGetStartedSprints);
router.get("/tasks/:sprintId", protect, sprintControlelr.handleGetTasksBySprintWithStatus);
router.get("/id/:sprintId", protect, sprintControlelr.handleGetSprintById);

module.exports = router;
