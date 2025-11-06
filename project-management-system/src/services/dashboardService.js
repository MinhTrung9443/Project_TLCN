const Task = require("../models/Task");
const Project = require("../models/Project");
const AuditLog = require("../models/AuditLog");

const dashboardService = {
  async getUserOverview(userId) {
    // Sử dụng ObjectId thực tế của statusId
    const STATUS = {
      TODO: "68db39cfb382ed0ccf39b1f7",
      IN_PROGRESS: "68db39cfb382ed0ccf39b1f8",
      DONE: "68db39cfb382ed0ccf39b1f9",
    };

    // Đếm số task theo trạng thái
    const [total, done, overdue] = await Promise.all([
      Task.countDocuments({ assigneeId: userId }),
      Task.countDocuments({ assigneeId: userId, statusId: STATUS.DONE }),
      Task.countDocuments({
        assigneeId: userId,
        statusId: { $ne: STATUS.DONE },
        dueDate: { $lt: new Date() },
      }),
    ]);

    // Task sắp đến hạn (chưa done, còn hạn)
    const upcomingTasks = await Task.find({
      assigneeId: userId,
      statusId: { $ne: STATUS.DONE },
      dueDate: { $gte: new Date() },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .select("name dueDate statusId projectId")
      .populate("projectId", "name key")
      .populate("statusId", "name");

    // Dự án tham gia (dựa vào Project.members.userId)
    const projects = await Project.find({ "members.userId": userId });
    const projectProgress = await Promise.all(
      projects.map(async (project) => {
        const total = await Task.countDocuments({ projectId: project._id });
        const completed = await Task.countDocuments({ projectId: project._id, statusId: STATUS.DONE });
        // Tìm role của user trong project
        const member = project.members.find((m) => m.userId.equals(userId));
        return {
          project: project.name,
          projectKey: project.key,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
          role: member?.role || "Member",
        };
      })
    );

    // Recent Activity: lấy từ bảng AuditLog, chỉ lấy các thay đổi do user này thực hiện
    const auditLogs = await require("../models/AuditLog")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "fullname avatar")
      .lean();

    // Chuẩn hóa dữ liệu trả về cho Recent Activity đúng format UI
    const recentActivity = auditLogs.map((log) => {
      // Xác định loại entity
      let entityType = log.tableName?.toLowerCase() || "task";
      let entityKey = log.newData?.key || log.newData?.code || log.recordId || log.newData?._id || log.oldData?._id || "";
      let entityName = log.newData?.name || log.newData?.title || log.oldData?.name || log.oldData?.title || "";
      let entityUrl = null;
      if (entityType === "task") entityUrl = `/tasks/${entityKey}`;
      else if (entityType === "project") entityUrl = `/projects/${entityKey}`;
      // ...có thể mở rộng cho các loại entity khác
      return {
        user: {
          name: log.userId?.fullname || "Unknown",
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

    return {
      total,
      done,
      overdue,
      upcomingTasks,
      projectProgress,
      recentActivity,
    };
  },

  async getMyTasks(userId, filters) {
    const { projectId, priorityId, statusId } = filters;
    const query = { assigneeId: userId };
    if (projectId) query.projectId = projectId;
    if (priorityId) query.priorityId = priorityId;
    if (statusId) query.statusId = statusId;
    return Task.find(query).populate("projectId", "name key").populate("statusId", "name").sort({ dueDate: 1 });
  },

  async getUserActivityFeed(userId, limit = 20) {
    return AuditLog.find({
      $or: [{ userId }, { "newData.assigneeId": userId }, { "newData.mentionIds": userId }],
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("userId", "full_name avatar");
  },

  async getUserStats(userId) {
    const STATUS = {
      DONE: "68db39cfb382ed0ccf39b1f9",
    };
    const statusAgg = await Task.aggregate([{ $match: { assigneeId: userId } }, { $group: { _id: "$statusId", count: { $sum: 1 } } }]);
    const weekAgg = await Task.aggregate([
      { $match: { assigneeId: userId, statusId: STATUS.DONE } },
      {
        $group: {
          _id: { $isoWeek: "$updatedAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const doneCount = await Task.countDocuments({ assigneeId: userId, statusId: STATUS.DONE });
    return { statusAgg, weekAgg, doneCount };
  },

  async getUserProjects(userId) {
    return Project.find({ "members.userId": userId }).select("name key members");
  },
};

module.exports = dashboardService;
