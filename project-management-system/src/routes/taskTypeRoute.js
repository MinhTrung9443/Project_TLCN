const express = require("express");
const router = express.Router();
const taskTypeController = require("../controllers/TaskTypeController.js");
const { protect, admin } = require("../middleware/authMiddleware");

router.get("/", protect, taskTypeController.getAllTaskTypes);

router.post("/", protect, admin, taskTypeController.createTaskType);

router.put("/:id", protect, admin, taskTypeController.updateTaskType);

router.delete("/:id", protect, admin, taskTypeController.deleteTaskType);

router.get("/:id", protect, taskTypeController.getTaskTypeById);

module.exports = router;
