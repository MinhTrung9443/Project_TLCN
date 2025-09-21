const express = require("express");
const router = express.Router();
const taskTypeController = require("../controllers/TaskTypeController.js");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.get("/", protect, taskTypeController.getAllTaskTypes);

router.post("/", protect, isAdmin, taskTypeController.createTaskType);

router.put("/:id", protect, isAdmin, taskTypeController.updateTaskType);

router.delete("/:id", protect, isAdmin, taskTypeController.deleteTaskType);

router.get("/:id", protect, taskTypeController.getTaskTypeById);

module.exports = router;
