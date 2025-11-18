const TimeLog = require("../models/TimeLog");
const Task = require("../models/Task");
const { logAction } = require("./AuditLogHelper");

const timeLogService = {
  // Tạo log time mới
  createTimeLog: async (taskId, userId, timeSpent, comment) => {
    try {
      // Validate task tồn tại
      const task = await Task.findById(taskId);
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

      return timeLog;
    } catch (error) {
      throw error;
    }
  },

  // Lấy danh sách time logs của một task
  getTimeLogsByTask: async (taskId) => {
    try {
      const timeLogs = await TimeLog.find({ taskId }).populate("userId", "fullname email avatar").sort({ createdAt: -1 });

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
