const AuditLog = require("../models/AuditLog");

const auditLogService = {
  async getProjectAuditOverview(projectId) {
    const logs = await AuditLog.find({ "newData.projectId": projectId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("userId", "full_name avatar")
      .lean();
    // Thống kê số lượng action theo user
    const userStats = {};
    logs.forEach((log) => {
      const uid = log.userId?._id?.toString() || "unknown";
      if (!userStats[uid]) userStats[uid] = { name: log.userId?.full_name || "Unknown", avatar: log.userId?.avatar || null, count: 0 };
      userStats[uid].count++;
    });
    // Thống kê số lượng action theo loại (create/update/delete)
    const actionStats = { create: 0, update: 0, delete: 0 };
    logs.forEach((log) => {
      if (log.action?.includes("create")) actionStats.create++;
      else if (log.action?.includes("update")) actionStats.update++;
      else if (log.action?.includes("delete")) actionStats.delete++;
    });
    // Thống kê số lượng log theo ngày
    const dayStats = {};
    logs.forEach((log) => {
      const day = log.createdAt.toISOString().slice(0, 10);
      if (!dayStats[day]) dayStats[day] = 0;
      dayStats[day]++;
    });
    // Chuẩn hóa log cho FE
    const activity = logs.map((log) => {
      let entityType = log.tableName?.toLowerCase() || "task";
      let entityKey = log.newData?.key || log.newData?.code || log.recordId || log.newData?._id || log.oldData?._id || "";
      let entityName = log.newData?.name || log.newData?.title || log.oldData?.name || log.oldData?.title || "";
      let entityUrl = null;
      if (entityType === "task") entityUrl = `/tasks/${entityKey}`;
      else if (entityType === "project") entityUrl = `/projects/${entityKey}`;
      return {
        user: {
          name: log.userId?.full_name || "Unknown",
          avatar: log.userId?.avatar || null,
        },
        action: log.action || "activity",
        entityType,
        entityKey,
        entityName,
        createdAt: log.createdAt,
        entityUrl,
      };
    });
    return { userStats, actionStats, dayStats, activity };
  },

  async getProjectAuditLogs(projectId, page = 1, limit = 20) {
    const skip = (Number(page) - 1) * Number(limit);
    const logs = await AuditLog.find({ "newData.projectId": projectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("userId", "full_name avatar")
      .lean();
    return logs;
  },
};

module.exports = auditLogService;
