const auditLogService = require("../services/auditLogService");

// Lấy tổng quan auditlog cho admin: theo project, theo user, theo thời gian
exports.getProjectAuditOverview = async (req, res) => {
  try {
    const { projectId } = req.query;
    const data = await auditLogService.getProjectAuditOverview(projectId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Lấy log chi tiết cho 1 project (phân trang)
exports.getProjectAuditLogs = async (req, res) => {
  try {
    const { projectId, page = 1, limit = 20 } = req.query;
    const logs = await auditLogService.getProjectAuditLogs(projectId, page, limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
