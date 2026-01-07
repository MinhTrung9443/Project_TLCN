const express = require("express");
const router = express.Router();
const taskTypeController = require("../controllers/TaskTypeController.js");
const { protect, admin } = require("../middleware/authMiddleware");

router.get("/", protect, taskTypeController.getAllTaskTypes);

router.post("/", protect, taskTypeController.createTaskType);

router.put("/:id", protect, taskTypeController.updateTaskType);

router.delete("/:id", protect, taskTypeController.deleteTaskType);

router.get("/:id", protect, taskTypeController.getTaskTypeById);

module.exports = router;
