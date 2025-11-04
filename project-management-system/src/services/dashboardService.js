const Task = require("../models/Task");
const Project = require("../models/Project");
const AuditLog = require("../models/AuditLog");

const dashboardService = {
  async getUserOverview(userId) {
    const [doing, done, overdue] = await Promise.all([
      Task.countDocuments({ assignee_id: userId, status: "In Progress" }),
      Task.countDocuments({ assignee_id: userId, status: "Done" }),
      Task.countDocuments({
        assignee_id: userId,
        status: { $ne: "Done" },
        dueDate: { $lt: new Date() },
      }),
    ]);

    const upcomingTasks = await Task.find({
      assignee_id: userId,
      status: { $ne: "Done" },
      dueDate: { $gte: new Date() },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .select("name dueDate status project_key");

    const projects = await Project.find({ members: userId });
    const projectProgress = await Promise.all(
      projects.map(async (project) => {
        const total = await Task.countDocuments({ project_key: project.project_key });
        const completed = await Task.countDocuments({ project_key: project.project_key, status: "Done" });
        return {
          project: project.project_name,
          projectKey: project.project_key,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
          role: project.membersWithRole?.find((m) => m.userId.equals(userId))?.role || "Member",
        };
      })
    );

    const notifications = await AuditLog.find({
      $or: [{ userId }, { "newData.assignee_id": userId }, { "newData.mentionIds": userId }],
    })
      .sort({ createdAt: -1 })
      .limit(10);

    return {
      doing,
      done,
      overdue,
      upcomingTasks,
      projectProgress,
      notifications,
    };
  },

  async getMyTasks(userId, filters) {
    const { projectKey, priority, status } = filters;
    const query = { assignee_id: userId };
    if (projectKey) query.project_key = projectKey;
    if (priority) query.priority = priority;
    if (status) query.status = status;
    return Task.find(query).populate("project_key", "project_name").sort({ dueDate: 1 });
  },

  async getUserActivityFeed(userId, limit = 20) {
    return AuditLog.find({
      $or: [{ userId }, { "newData.assignee_id": userId }, { "newData.mentionIds": userId }],
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("userId", "full_name avatar");
  },

  async getUserStats(userId) {
    const statusAgg = await Task.aggregate([{ $match: { assignee_id: userId } }, { $group: { _id: "$status", count: { $sum: 1 } } }]);
    const weekAgg = await Task.aggregate([
      { $match: { assignee_id: userId, status: "Done" } },
      {
        $group: {
          _id: { $isoWeek: "$updatedAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const doneCount = await Task.countDocuments({ assignee_id: userId, status: "Done" });
    return { statusAgg, weekAgg, doneCount };
  },

  async getUserProjects(userId) {
    return Project.find({ members: userId }).select("project_name project_key membersWithRole");
  },
};

module.exports = dashboardService;
