const AuditLog = require("../models/AuditLog");
const Project = require("../models/Project");
const User = require("../models/User");
const mongoose = require("mongoose");

const auditLogService = {
  async getProjectAuditOverview(projectId) {
    console.log("Getting audit overview for projectId:", projectId);

    // [SỬA 1] - Lấy thông tin project theo schema mới
    // Không cần lấy members ở đây nữa, vì log được query theo projectId
    const project = await Project.findById(projectId).select("_id").lean();
    if (!project) {
      console.log("Project not found");
      // Trả về cấu trúc dữ liệu rỗng để frontend không bị lỗi
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