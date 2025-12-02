const auditLogService = require("../services/auditLogService");

// Lấy tổng quan auditlog cho admin: theo project, theo user, theo thời gian
exports.getProjectAuditOverview = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }
    const data = await auditLogService.getProjectAuditOverview(projectId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// Lấy log chi tiết cho 1 project (phân trang)
exports.getProjectAuditLogs = async (req, res) => {
  try {
    const { projectId, page = 1, limit = 20, userId, action, tableName } = req.query;
    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }
    const filters = {};
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (tableName) filters.tableName = tableName;

    const logs = await auditLogService.getProjectAuditLogs(projectId, page, limit, filters);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
