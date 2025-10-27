const express = require("express");
const router = express.Router();
const ganttController = require("../controllers/GanttController.js");
const { protect } = require("../middleware/authMiddleware");

router.post("/data", protect, ganttController.getGanttData);

module.exports = router;
