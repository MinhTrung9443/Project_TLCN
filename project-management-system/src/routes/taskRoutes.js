const express = require("express");
const router = express.Router();
const { handleGetTasksByProjectKey, handleCreateTask, changeSprint, handleUpdateTaskStatus, handleSearchTasks, handleUpdateTask, handleDeleteTask  } = require("../controllers/TaskController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.get("/search", protect, handleSearchTasks);

router.get("/project/:projectKey", protect, handleGetTasksByProjectKey);

router.post("/", protect, handleCreateTask);

router.put("/change-sprint/:taskId", protect, isAdmin, changeSprint);

// New route for updating task status
router.put("/update-status/:taskId", protect, handleUpdateTaskStatus);

router.patch("/:id", protect, handleUpdateTask);
router.delete("/:id", protect, handleDeleteTask);
module.exports = router;
