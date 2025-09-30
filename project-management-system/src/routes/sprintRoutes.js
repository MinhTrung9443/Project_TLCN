const express = require("express");
const router = express.Router();
const sprintControlelr = require("../controllers/SprintController.js");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.get("/:projectKey", protect, sprintControlelr.handleGetSprintsByProjectKey);
router.post("/:projectKey", protect, isAdmin, sprintControlelr.handleCreateSprint);
router.put("/:sprintId", protect,isAdmin, sprintControlelr.handleUpdateSprint);
router.delete("/:sprintId", protect,isAdmin, sprintControlelr.handleDeleteSprint);


module.exports = router;
