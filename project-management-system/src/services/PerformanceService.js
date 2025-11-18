const Task = require("../models/Task");
const TimeLog = require("../models/TimeLog");
const User = require("../models/User");

const performanceService = {
  /**
   * Tính toán SPI (Schedule Performance Index) cho một task
   * SPI = (estimatedTime × progress) / actualTime
   * SPI > 1.0: Hiệu suất tốt
   * SPI = 1.0: Đúng kế hoạch
   * SPI < 1.0: Chậm tiến độ
   */
  calculateTaskSPI: (task) => {
    if (!task.actualTime || task.actualTime === 0) {
      return null; // Chưa có dữ liệu
    }

    const estimatedTime = task.estimatedTime || 0;
    const progress = task.progress || 0;
    const actualTime = task.actualTime || 0;

    // SPI = (T_est × P_act) / T_act
    const spi = (estimatedTime * progress) / (actualTime * 100);

    return {
      spi: parseFloat(spi.toFixed(2)),
      estimatedTime,
      actualTime,
      progress,
      earnedValue: (estimatedTime * progress) / 100, // Công việc đã hoàn thành tính theo giờ
    };
  },

  /**
   * Lấy thống kê hiệu suất của một user trong một project
   */
  getUserPerformanceInProject: async (userId, projectId, options = {}) => {
    try {
      // Validate inputs
      if (!userId || !projectId) {
        throw { statusCode: 400, message: "userId and projectId are required" };
      }

      // Validate ObjectId format
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw { statusCode: 400, message: "Invalid userId format" };
      }
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw { statusCode: 400, message: "Invalid projectId format" };
      }

      const { startDate, endDate } = options;

      // Query filters
      const taskFilter = {
        projectId,
        assigneeId: userId,
        actualTime: { $gt: 0 }, // Chỉ lấy task đã có time log
      };

      if (startDate || endDate) {
        taskFilter.updatedAt = {};
        if (startDate) taskFilter.updatedAt.$gte = new Date(startDate);
        if (endDate) taskFilter.updatedAt.$lte = new Date(endDate);
      }

      // Lấy tất cả tasks của user
      const tasks = await Task.find(taskFilter)
        .populate("statusId", "name category")
        .populate("taskTypeId", "name icon")
        .populate("priorityId", "name")
        .sort({ updatedAt: -1 });

      // Tính toán SPI cho từng task
      const tasksWithSPI = tasks.map((task) => {
        const spiData = performanceService.calculateTaskSPI(task);
        return {
          _id: task._id,
          key: task.key,
          name: task.name,
          estimatedTime: task.estimatedTime,
          actualTime: task.actualTime,
          progress: task.progress,
          status: task.statusId,
          taskType: task.taskTypeId,
          priority: task.priorityId,
          spi: spiData ? spiData.spi : null,
          earnedValue: spiData ? spiData.earnedValue : 0,
          isCompleted: task.progress === 100,
        };
      });

      // Tính toán tổng hợp
      let totalEstimatedTime = 0;
      let totalActualTime = 0;
      let totalEarnedValue = 0;
      let completedTasks = 0;
      let inProgressTasks = 0;

      tasksWithSPI.forEach((task) => {
        totalEstimatedTime += task.estimatedTime || 0;
        totalActualTime += task.actualTime || 0;
        totalEarnedValue += task.earnedValue || 0;

        if (task.isCompleted) {
          completedTasks++;
        } else if (task.progress > 0) {
          inProgressTasks++;
        }
      });

      // SPI tổng thể = Tổng Earned Value / Tổng Actual Time
      const overallSPI = totalActualTime > 0 ? parseFloat((totalEarnedValue / totalActualTime).toFixed(2)) : null;

      // Phân loại hiệu suất
      let performanceRating = "No Data";
      if (overallSPI !== null) {
        if (overallSPI >= 1.2) performanceRating = "Excellent";
        else if (overallSPI >= 1.0) performanceRating = "Good";
        else if (overallSPI >= 0.8) performanceRating = "Average";
        else performanceRating = "Needs Improvement";
      }

      return {
        userId,
        projectId,
        tasks: tasksWithSPI,
        summary: {
          totalTasks: tasks.length,
          completedTasks,
          inProgressTasks,
          totalEstimatedTime: parseFloat(totalEstimatedTime.toFixed(2)),
          totalActualTime: parseFloat(totalActualTime.toFixed(2)),
          totalEarnedValue: parseFloat(totalEarnedValue.toFixed(2)),
          overallSPI,
          performanceRating,
          efficiency: overallSPI ? `${(overallSPI * 100).toFixed(0)}%` : "N/A",
        },
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Lấy top performers trong một project
   */
  getTopPerformers: async (projectId, limit = 10) => {
    try {
      // Lấy tất cả tasks trong project đã có time log
      const tasks = await Task.find({
        projectId,
        actualTime: { $gt: 0 },
      }).populate("assigneeId", "fullname email avatar");

      // Nhóm theo user và tính SPI
      const userPerformanceMap = {};

      tasks.forEach((task) => {
        if (!task.assigneeId) return;

        const userId = task.assigneeId._id.toString();
        if (!userPerformanceMap[userId]) {
          userPerformanceMap[userId] = {
            user: task.assigneeId,
            totalEstimatedTime: 0,
            totalActualTime: 0,
            totalEarnedValue: 0,
            taskCount: 0,
          };
        }

        const spiData = performanceService.calculateTaskSPI(task);
        if (spiData) {
          userPerformanceMap[userId].totalEstimatedTime += task.estimatedTime || 0;
          userPerformanceMap[userId].totalActualTime += task.actualTime || 0;
          userPerformanceMap[userId].totalEarnedValue += spiData.earnedValue || 0;
          userPerformanceMap[userId].taskCount++;
        }
      });

      // Tính SPI cho từng user và sắp xếp
      const performers = Object.values(userPerformanceMap)
        .map((data) => {
          const spi = data.totalActualTime > 0 ? data.totalEarnedValue / data.totalActualTime : 0;
          return {
            userId: data.user._id,
            name: data.user.fullname,
            email: data.user.email,
            avatar: data.user.avatar,
            spi: parseFloat(spi.toFixed(2)),
            totalEstimatedTime: parseFloat(data.totalEstimatedTime.toFixed(2)),
            totalActualTime: parseFloat(data.totalActualTime.toFixed(2)),
            taskCount: data.taskCount,
          };
        })
        .sort((a, b) => b.spi - a.spi)
        .slice(0, limit);

      return performers;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Lấy chi tiết time logs của user
   */
  getUserTimeLogs: async (userId, projectId, options = {}) => {
    try {
      const { startDate, endDate, limit = 50 } = options;

      // Lấy tất cả tasks của user trong project
      const tasks = await Task.find({
        projectId,
        assigneeId: userId,
      }).select("_id");

      const taskIds = tasks.map((t) => t._id);

      // Query time logs
      const timeLogFilter = {
        taskId: { $in: taskIds },
        userId,
      };

      if (startDate || endDate) {
        timeLogFilter.logDate = {};
        if (startDate) timeLogFilter.logDate.$gte = new Date(startDate);
        if (endDate) timeLogFilter.logDate.$lte = new Date(endDate);
      }

      const timeLogs = await TimeLog.find(timeLogFilter).populate("taskId", "key name").sort({ logDate: -1 }).limit(limit);

      return timeLogs;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = performanceService;
