const express = require("express");
const router = express.Router();
const { getProjectAuditOverview, getProjectAuditLogs } = require("../controllers/auditLogController");
const { protect } = require("../middleware/authMiddleware");

// Admin hoặc PM xem tổng quan auditlog của 1 project
router.get("/overview", protect, getProjectAuditOverview);
// Admin hoặc PM xem chi tiết log của 1 project (phân trang)
router.get("/logs", protect, getProjectAuditLogs);

module.exports = router;
