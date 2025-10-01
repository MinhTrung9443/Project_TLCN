const express = require("express");
const router = express.Router();
const { handleGetTasksByProjectKey, handleCreateTask, changeSprint } = require("../controllers/TaskController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.get("/project/:projectKey", protect, handleGetTasksByProjectKey);

router.post("/", protect, handleCreateTask);

router.put("/change-sprint/:taskId", protect, isAdmin, changeSprint);

module.exports = router;
