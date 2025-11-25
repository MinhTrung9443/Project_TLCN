const express = require("express");
const router = express.Router();
const { getProjectAuditOverview, getProjectAuditLogs } = require("../controllers/auditLogController");
const { protect, adminOrPM } = require("../middleware/authMiddleware");

// Admin hoặc PM xem tổng quan auditlog của 1 project
router.get("/overview", protect, adminOrPM, getProjectAuditOverview);
// Admin hoặc PM xem chi tiết log của 1 project (phân trang)
router.get("/logs", protect, adminOrPM, getProjectAuditLogs);

module.exports = router;
