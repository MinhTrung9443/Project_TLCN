const express = require("express");
const router = express.Router();
const { getProjectAuditOverview, getProjectAuditLogs } = require("../controllers/auditLogController");
const { protect, admin } = require("../middleware/authMiddleware");

// Admin xem tổng quan auditlog của 1 project
router.get("/overview", protect, admin, getProjectAuditOverview);
// Admin xem chi tiết log của 1 project (phân trang)
router.get("/logs", protect, admin, getProjectAuditLogs);

module.exports = router;
