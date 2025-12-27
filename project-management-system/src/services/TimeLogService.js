const TimeLog = require("../models/TimeLog");
const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { logAction } = require("./AuditLogHelper");

const timeLogService = {
  // Tạo log time mới
  createTimeLog: async (taskId, userId, timeSpent, comment) => {
    try {
      // Validate task tồn tại
      const task = await Task.findById(taskId).populate("projectId");
      if (!task) {
        throw { statusCode: 404, message: "Task not found" };
      }

      // Tạo time log
      const timeLog = new TimeLog({
        taskId,
        userId,
        timeSpent,
        comment,
      });

      await timeLog.save();

      // Cập nhật actualTime của task
      task.actualTime = (task.actualTime || 0) + timeSpent;
      await task.save();

      // Log action
      await logAction({
        userId,
        action: "log_time",
        tableName: "TimeLog",
        recordId: timeLog._id,
        newData: timeLog,
      });

      // Populate user info
      await timeLog.populate("userId", "fullname email avatar");

      // Tạo thông báo cho PM và Leader của project
      if (task.projectId) {
        const project = await Project.findById(task.projectId._id)
          .populate("members.userId", "_id fullname username email avatar status role")
          .populate("teams.leaderId", "_id fullname username email avatar status");

        if (project) {
          const recipientIds = new Set();

          // Thêm PM từ members array
          if (project.members && Array.isArray(project.members)) {
            const projectManagers = project.members.filter((m) => m.role === "PROJECT_MANAGER");
            projectManagers.forEach((pm) => {
              if (pm.userId && pm.userId._id.toString() !== userId.toString()) {
                recipientIds.add(pm.userId._id.toString());
              }
            });
          }

          // Thêm các leaders từ teams
          if (project.teams && Array.isArray(project.teams)) {
            project.teams.forEach((team) => {
              if (team.leaderId && team.leaderId._id.toString() !== userId.toString()) {
                recipientIds.add(team.leaderId._id.toString());
              }
            });
          }

          // Tạo thông báo cho từng người
          const user = await User.findById(userId);
          const notifications = Array.from(recipientIds).map((recipientId) => ({
            userId: recipientId,
            title: "Time Logged",
            message: `${user?.fullname || "A member"} logged ${timeSpent}h on task ${task.key || taskId}`,
            type: "time_log",
            relatedId: timeLog._id,
            relatedType: "TimeLog",
            isRead: false,
          }));

          if (notifications.length > 0) {
            await Notification.insertMany(notifications);
          }
        }
      }

      return timeLog;
    } catch (error) {
      throw error;
    }
  },

  // Lấy danh sách time logs của một task
  getTimeLogsByTask: async (taskId) => {
    try {
      const timeLogs = await TimeLog.find({ taskId }).populate("userId", "_id fullname username email avatar status").sort({ createdAt: -1 });

      return timeLogs;
    } catch (error) {
      throw error;
    }
  },

  // Lấy tổng thời gian đã log của một task
  getTotalTimeByTask: async (taskId) => {
    try {
      const result = await TimeLog.aggregate([
        { $match: { taskId: mongoose.Types.ObjectId(taskId) } },
        { $group: { _id: null, totalTime: { $sum: "$timeSpent" } } },
      ]);

      return result.length > 0 ? result[0].totalTime : 0;
    } catch (error) {
      throw error;
    }
  },

  // Cập nhật time log
  updateTimeLog: async (timeLogId, userId, updateData) => {
    try {
      const oldTimeLog = await TimeLog.findById(timeLogId);
      if (!oldTimeLog) {
        throw { statusCode: 404, message: "Time log not found" };
      }

      // Chỉ người tạo mới có thể sửa
      if (oldTimeLog.userId.toString() !== userId.toString()) {
        throw { statusCode: 403, message: "You can only edit your own time logs" };
      }

      const timeDiff = updateData.timeSpent - oldTimeLog.timeSpent;

      const updatedTimeLog = await TimeLog.findByIdAndUpdate(timeLogId, updateData, { new: true }).populate("userId", "fullname email avatar");

      // Cập nhật actualTime của task
      if (timeDiff !== 0) {
        const task = await Task.findById(oldTimeLog.taskId);
        if (task) {
          task.actualTime = (task.actualTime || 0) + timeDiff;
          await task.save();
        }
      }

      await logAction({
        userId,
        action: "update_timelog",
        tableName: "TimeLog",
        recordId: timeLogId,
        oldData: oldTimeLog,
        newData: updatedTimeLog,
      });

      return updatedTimeLog;
    } catch (error) {
      throw error;
    }
  },

  // Xóa time log
  deleteTimeLog: async (timeLogId, userId) => {
    try {
      const timeLog = await TimeLog.findById(timeLogId);
      if (!timeLog) {
        throw { statusCode: 404, message: "Time log not found" };
      }

      // Chỉ người tạo hoặc admin mới có thể xóa
      if (timeLog.userId.toString() !== userId.toString()) {
        throw { statusCode: 403, message: "You can only delete your own time logs" };
      }

      // Cập nhật actualTime của task
      const task = await Task.findById(timeLog.taskId);
      if (task) {
        task.actualTime = Math.max(0, (task.actualTime || 0) - timeLog.timeSpent);
        await task.save();
      }

      await TimeLog.findByIdAndDelete(timeLogId);

      await logAction({
        userId,
        action: "delete_timelog",
        tableName: "TimeLog",
        recordId: timeLogId,
        oldData: timeLog,
      });

      return { message: "Time log deleted successfully" };
    } catch (error) {
      throw error;
    }
  },

  // Lấy thống kê time log theo user
  getTimeLogStatsByUser: async (userId, startDate, endDate) => {
    try {
      const matchStage = { userId: mongoose.Types.ObjectId(userId) };

      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }

      const stats = await TimeLog.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalTime: { $sum: "$timeSpent" },
            totalLogs: { $sum: 1 },
          },
        },
      ]);

      return stats.length > 0 ? stats[0] : { totalTime: 0, totalLogs: 0 };
    } catch (error) {
      throw error;
    }
  },
};

module.exports = timeLogService;
