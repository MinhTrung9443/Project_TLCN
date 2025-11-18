const AuditLog = require("../models/AuditLog");
const Project = require("../models/Project");
const mongoose = require("mongoose");

const auditLogService = {
  async getProjectAuditOverview(projectId) {
    console.log("Getting audit overview for projectId:", projectId);

    // Lấy thông tin project và danh sách members + groups
    const project = await Project.findById(projectId).select("members groups").populate("groups.groupId", "members").lean();
    if (!project) {
      console.log("Project not found");
      return {
        userStats: {},
        actionStats: { create: 0, update: 0, delete: 0, total: 0 },
        entityStats: {},
        dayStats: {},
        activity: [],
        totalLogs: 0,
      };
    }

    // Lấy danh sách userId từ members trực tiếp
    const directMemberIds = project.members.map((m) => m.userId);

    // Lấy danh sách userId từ các groups
    const groupMemberIds = [];
    if (project.groups && project.groups.length > 0) {
      project.groups.forEach((g) => {
        if (g.groupId && g.groupId.members) {
          g.groupId.members.forEach((member) => {
            if (member.userId) {
              groupMemberIds.push(member.userId);
            }
          });
        }
      });
    }

    // Gộp tất cả memberIds và loại bỏ duplicate
    const allMemberIds = [...new Set([...directMemberIds, ...groupMemberIds].map((id) => id.toString()))];
    console.log("Project direct members:", directMemberIds.length, ", Group members:", groupMemberIds.length, ", Total unique:", allMemberIds.length);

    // Chuẩn hóa projectId thành ObjectId
    const projectObjectId = mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId;
    const projectIdString = projectId.toString();

    // Query logs: CHỈ lấy logs liên quan đến PROJECT NÀY
    // Phải có projectId trong newData hoặc oldData (hỗ trợ cả ObjectId và String)
    const logs = await AuditLog.find({
      $or: [
        { "newData.projectId": projectObjectId }, // projectId dạng ObjectId
        { "oldData.projectId": projectObjectId },
        { "newData.projectId": projectIdString }, // projectId dạng String
        { "oldData.projectId": projectIdString },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("userId", "fullname avatar")
      .lean();

    console.log("Found logs for project:", projectIdString, "- Total:", logs.length);

    // Thống kê số lượng action theo user
    const userStats = {};
    logs.forEach((log) => {
      const uid = log.userId?._id?.toString() || "unknown";
      if (!userStats[uid]) {
        userStats[uid] = {
          userId: uid, // Thêm userId vào đây
          name: log.userId?.fullname || "Unknown",
          avatar: log.userId?.avatar || null,
          count: 0,
          actions: { create: 0, update: 0, delete: 0 },
        };
      }
      userStats[uid].count++;
      // Đếm theo loại action
      if (log.action?.includes("create")) userStats[uid].actions.create++;
      else if (log.action?.includes("update")) userStats[uid].actions.update++;
      else if (log.action?.includes("delete")) userStats[uid].actions.delete++;
    });

    // Thống kê số lượng action theo loại (create/update/delete)
    const actionStats = { create: 0, update: 0, delete: 0, total: logs.length };
    logs.forEach((log) => {
      if (log.action?.includes("create")) actionStats.create++;
      else if (log.action?.includes("update")) actionStats.update++;
      else if (log.action?.includes("delete")) actionStats.delete++;
    });

    // Thống kê theo loại entity (Task, Project, Sprint, etc.)
    const entityStats = {};
    logs.forEach((log) => {
      const entity = log.tableName || "Other";
      if (!entityStats[entity]) entityStats[entity] = 0;
      entityStats[entity]++;
    });

    // Thống kê số lượng log theo ngày (7 ngày gần nhất)
    const dayStats = {};
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      last7Days.push(dayStr);
      dayStats[dayStr] = 0;
    }
    logs.forEach((log) => {
      const day = log.createdAt.toISOString().slice(0, 10);
      if (dayStats.hasOwnProperty(day)) {
        dayStats[day]++;
      }
    });

    // Chuẩn hóa log cho FE (chỉ lấy 20 activity gần nhất)
    const activity = logs.slice(0, 20).map((log) => {
      let entityType = log.tableName?.toLowerCase() || "task";
      let entityKey = log.newData?.key || log.newData?.code || log.recordId || log.newData?._id || log.oldData?._id || "";
      let entityName = log.newData?.name || log.newData?.title || log.oldData?.name || log.oldData?.title || "";
      let entityUrl = null;
      if (entityType === "task") entityUrl = `/tasks/${entityKey}`;
      else if (entityType === "project") entityUrl = `/projects/${entityKey}`;
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
      userStats,
      actionStats,
      entityStats,
      dayStats,
      activity,
      totalLogs: logs.length,
    };
  },

  async getProjectAuditLogs(projectId, page = 1, limit = 20) {
    console.log("Getting audit logs for projectId:", projectId, "page:", page);

    // Lấy thông tin project và danh sách members + groups
    const project = await Project.findById(projectId).select("members groups").populate("groups.groupId", "members").lean();
    if (!project) {
      console.log("Project not found");
      return [];
    }

    // Lấy danh sách userId từ members trực tiếp
    const directMemberIds = project.members.map((m) => m.userId);

    // Lấy danh sách userId từ các groups
    const groupMemberIds = [];
    if (project.groups && project.groups.length > 0) {
      project.groups.forEach((g) => {
        if (g.groupId && g.groupId.members) {
          g.groupId.members.forEach((member) => {
            if (member.userId) {
              groupMemberIds.push(member.userId);
            }
          });
        }
      });
    }

    // Gộp tất cả memberIds và loại bỏ duplicate
    const allMemberIds = [...new Set([...directMemberIds, ...groupMemberIds].map((id) => id.toString()))];

    // Chuẩn hóa projectId thành ObjectId
    const projectObjectId = mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId;
    const projectIdString = projectId.toString();

    const skip = (Number(page) - 1) * Number(limit);
    // Query logs: CHỈ lấy logs liên quan đến PROJECT NÀY (hỗ trợ cả ObjectId và String)
    const logs = await AuditLog.find({
      $or: [
        { "newData.projectId": projectObjectId },
        { "oldData.projectId": projectObjectId },
        { "newData.projectId": projectIdString },
        { "oldData.projectId": projectIdString },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("userId", "fullname avatar")
      .lean();
    console.log("Found detailed logs for page", page, ":", logs.length);
    return logs;
  },
};

module.exports = auditLogService;
