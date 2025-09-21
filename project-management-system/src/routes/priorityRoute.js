const express = require("express");
const router = express.Router();
const priorityController = require("../controllers/PriorityController.js");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.get("/", protect, priorityController.getAllPriorities);

router.post("/", protect, isAdmin, priorityController.createPriority);

router.put("/:id", protect, isAdmin, priorityController.updatePriority);

router.delete("/:id", protect, isAdmin, priorityController.deletePriority);

router.get("/:id", protect, priorityController.getPriorityById);

module.exports = router;
