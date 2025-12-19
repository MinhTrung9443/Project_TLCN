const express = require("express");
const router = express.Router();
const taskTypeController = require("../controllers/TaskTypeController.js");
const { protect, admin, adminOrProjectPM } = require("../middleware/authMiddleware");

router.get("/", protect, taskTypeController.getAllTaskTypes);

router.post("/", protect, adminOrProjectPM, taskTypeController.createTaskType);

router.put("/:id", protect, adminOrProjectPM, taskTypeController.updateTaskType);

router.delete("/:id", protect, adminOrProjectPM, taskTypeController.deleteTaskType);

router.get("/:id", protect, taskTypeController.getTaskTypeById);

module.exports = router;
