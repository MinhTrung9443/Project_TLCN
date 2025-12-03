const AuditLog = require("../models/AuditLog");
const Project = require("../models/Project");
const User = require("../models/User");
const Task = require("../models/Task");
const Sprint = require("../models/Sprint");
const Platform = require("../models/Platform");
const TaskType = require("../models/TaskType");
const Priority = require("../models/Priority");
const Group = require("../models/Group");
const mongoose = require("mongoose");

const auditLogService = {
  async getProjectAuditOverview(projectId) {
    console.log("Getting audit overview for projectId:", projectId);

    // Lấy thông tin project với members và teams
    const project = await Project.findById(projectId).select("members teams").lean();

    if (!project) {
      console.log("Project not found");
      return {
        userStats: {},
        actionStats: { create: 0, update: 0, delete: 0, total: 0 },
        entityStats: {},
        dayStats: {},
        totalLogs: 0,
      };
    }

    // Lấy danh sách userId từ members trực tiếp
    const directMemberIds = (project.members || []).map((m) => m.userId);

    // Lấy danh sách userId từ các teams
    const teamMemberIds = [];
    if (project.teams && project.teams.length > 0) {
      project.teams.forEach((team) => {
        // Thêm leader
        if (team.leaderId) {
          teamMemberIds.push(team.leaderId);
        }
        // Thêm members của team
        if (team.members && team.members.length > 0) {
          teamMemberIds.push(...team.members);
        }
      });
    }

    // Gộp tất cả memberIds và loại bỏ duplicate
    const allMemberIds = [...new Set([...directMemberIds, ...teamMemberIds].map((id) => id.toString()))];
    console.log("Project direct members:", directMemberIds.length, ", Team members:", teamMemberIds.length, ", Total unique:", allMemberIds.length);

    // Lấy thông tin đầy đủ của tất cả members
    const allMembers = await User.find({
      _id: { $in: allMemberIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select("fullname avatar")
      .lean();

    // Chuẩn hóa projectId thành ObjectId
    const projectObjectId = mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId;
    const projectIdString = projectId.toString();

    // Query logs liên quan đến project này
    const logs = await AuditLog.find({
      $or: [
        { "newData.projectId": projectObjectId },
        { "oldData.projectId": projectObjectId },
        { "newData.projectId": projectIdString },
        { "oldData.projectId": projectIdString },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(100) // Giới hạn 100 logs cho overview
      .populate("userId", "fullname avatar")
      .lean();

    console.log("Found logs for project overview:", logs.length);

    // Khởi tạo userStats với TẤT CẢ members (kể cả người chưa có hoạt động)
    const userStats = {};
    allMembers.forEach((member) => {
      const uid = member._id.toString();
      userStats[uid] = {
        userId: uid,
        name: member.fullname || "Unknown",
        avatar: member.avatar || null,
        count: 0,
        actions: { create: 0, update: 0, delete: 0 },
      };
    });

    // Cập nhật thống kê từ logs (chỉ cho những user đã có hoạt động)
    logs.forEach((log) => {
      const uid = log.userId?._id?.toString();
      if (uid && userStats[uid]) {
        userStats[uid].count++;
        // Đếm theo loại action
        if (log.action?.includes("create")) userStats[uid].actions.create++;
        else if (log.action?.includes("update")) userStats[uid].actions.update++;
        else if (log.action?.includes("delete")) userStats[uid].actions.delete++;
      }
    });

    // Thống kê số lượng action theo loại
    const actionStats = { create: 0, update: 0, delete: 0, total: logs.length };
    logs.forEach((log) => {
      if (log.action?.includes("create")) actionStats.create++;
      else if (log.action?.includes("update")) actionStats.update++;
      else if (log.action?.includes("delete")) actionStats.delete++;
    });

    // Thống kê theo loại entity
    const entityStats = {};
    logs.forEach((log) => {
      const entity = log.tableName || "Other";
      if (!entityStats[entity]) entityStats[entity] = 0;
      entityStats[entity]++;
    });

    // Thống kê theo ngày (7 ngày gần nhất)
    const dayStats = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      dayStats[dayStr] = 0;
    }
    logs.forEach((log) => {
      const day = log.createdAt.toISOString().slice(0, 10);
      if (dayStats.hasOwnProperty(day)) {
        dayStats[day]++;
      }
    });

    return {
      userStats,
      actionStats,
      entityStats,
      dayStats,
      totalLogs: logs.length,
    };
  },

  async getProjectAuditLogs(projectId, page = 1, limit = 20, filters = {}) {
    console.log("Getting audit logs for projectId:", projectId, "page:", page, "filters:", filters);

    // [SỬA 2] - Chỉ cần kiểm tra project có tồn tại không
    const projectExists = await Project.findById(projectId).select("_id").lean();
    if (!projectExists) {
      console.log("Project not found");
      return []; // Trả về mảng rỗng nếu project không tồn tại
    }

    // --- Logic query và phân trang của bạn đã tốt, giữ nguyên ---

    const projectObjectId = mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId;
    const projectIdString = projectId.toString();
    const skip = (Number(page) - 1) * Number(limit);

    // Build query with filters
    const query = {
      $or: [
        { "newData.projectId": projectObjectId },
        { "oldData.projectId": projectObjectId },
        { "newData.projectId": projectIdString },
        { "oldData.projectId": projectIdString },
      ],
    };

    // Apply filters
    if (filters.userId) {
      query.userId = filters.userId;
    }
    if (filters.action) {
      // Filter by action type (create, update, delete)
      query.action = { $regex: filters.action, $options: "i" };
    }
    if (filters.tableName) {
      query.tableName = filters.tableName;
    }

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate("userId", "fullname avatar").lean();

    // Populate record names based on table name
    for (let log of logs) {
      try {
        if (log.tableName === "Task" && log.recordId) {
          const task = await Task.findById(log.recordId).select("key name").lean();
          if (task) {
            log.recordName = `${task.key}: ${task.name}`;
          } else {
            const taskKey = log.newData?.key || log.oldData?.key;
            const taskName = log.newData?.name || log.oldData?.name;
            if (taskKey && taskName) {
              log.recordName = `${taskKey}: ${taskName}`;
            } else if (taskKey) {
              log.recordName = taskKey;
            }
          }
        } else if (log.tableName === "Sprint" && log.recordId) {
          const sprint = await Sprint.findById(log.recordId).select("name").lean();
          if (sprint) {
            log.recordName = sprint.name;
          } else {
            log.recordName = log.newData?.name || log.oldData?.name;
          }
        } else if (log.tableName === "Project" && log.recordId) {
          const project = await Project.findById(log.recordId).select("name").lean();
          if (project) {
            log.recordName = project.name;
          } else {
            log.recordName = log.newData?.name || log.oldData?.name;
          }
        } else if (log.tableName === "Platform" && log.recordId) {
          const platform = await Platform.findById(log.recordId).select("name").lean();
          if (platform) {
            log.recordName = platform.name;
          } else {
            log.recordName = log.newData?.name || log.oldData?.name;
          }
        } else if (log.tableName === "TaskType" && log.recordId) {
          const taskType = await TaskType.findById(log.recordId).select("name").lean();
          if (taskType) {
            log.recordName = taskType.name;
          } else {
            log.recordName = log.newData?.name || log.oldData?.name;
          }
        } else if (log.tableName === "Priority" && log.recordId) {
          const priority = await Priority.findById(log.recordId).select("name").lean();
          if (priority) {
            log.recordName = priority.name;
          } else {
            log.recordName = log.newData?.name || log.oldData?.name;
          }
        } else if (log.tableName === "Group" && log.recordId) {
          const group = await Group.findById(log.recordId).select("name").lean();
          if (group) {
            log.recordName = group.name;
          } else {
            log.recordName = log.newData?.name || log.oldData?.name;
          }
        } else if (log.tableName === "TimeLog" && log.recordId) {
          const timeSpent = log.newData?.timeSpent || log.oldData?.timeSpent;
          if (timeSpent) {
            log.recordName = `${timeSpent}h`;
          }
        } else if (log.tableName === "User" && log.recordId) {
          log.recordName = log.newData?.fullname || log.oldData?.fullname;
        }
      } catch (err) {
        console.log(`Error fetching ${log.tableName}:`, err.message);
      }
    }

    console.log("Found detailed logs for page", page, ":", logs.length);
    return logs;
  },
};

module.exports = auditLogService;
