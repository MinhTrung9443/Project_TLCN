const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

router.get("/overview", protect, dashboardController.getUserOverview);
router.get("/my-tasks", protect, dashboardController.getMyTasks);
router.get("/activity", protect, dashboardController.getUserActivityFeed);
router.get("/stats", protect, dashboardController.getUserStats);
router.get("/projects", protect, dashboardController.getUserProjects);

module.exports = router;
