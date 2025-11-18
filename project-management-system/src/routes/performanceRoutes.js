const express = require("express");
const router = express.Router();
const PerformanceController = require("../controllers/PerformanceController");
const { protect } = require("../middleware/authMiddleware");

// Tất cả routes đều cần authentication
router.use(protect);

// GET /api/performance/user/:userId/project/:projectId - Lấy thống kê hiệu suất của user trong project
router.get("/user/:userId/project/:projectId", PerformanceController.handleGetUserPerformance);

// GET /api/performance/project/:projectId/top - Lấy top performers trong project
router.get("/project/:projectId/top", PerformanceController.handleGetTopPerformers);

// GET /api/performance/user/:userId/project/:projectId/timelogs - Lấy time logs của user
router.get("/user/:userId/project/:projectId/timelogs", PerformanceController.handleGetUserTimeLogs);

module.exports = router;
