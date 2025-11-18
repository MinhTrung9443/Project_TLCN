const timeLogService = require("../services/TimeLogService");

// Tạo time log mới
const handleCreateTimeLog = async (req, res) => {
  try {
    const { taskId, timeSpent, comment } = req.body;
    const userId = req.user._id;

    if (!taskId || !timeSpent || !comment) {
      return res.status(400).json({
        message: "Task ID, time spent, and comment are required",
      });
    }

    if (timeSpent <= 0) {
      return res.status(400).json({
        message: "Time spent must be greater than 0",
      });
    }

    const timeLog = await timeLogService.createTimeLog(taskId, userId, timeSpent, comment);

    res.status(201).json({
      message: "Time logged successfully",
      data: timeLog,
    });
  } catch (error) {
    console.error("Error creating time log:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error creating time log",
    });
  }
};

// Lấy time logs của task
const handleGetTimeLogsByTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const timeLogs = await timeLogService.getTimeLogsByTask(taskId);

    res.status(200).json({
      message: "Time logs retrieved successfully",
      data: timeLogs,
    });
  } catch (error) {
    console.error("Error getting time logs:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error getting time logs",
    });
  }
};

// Cập nhật time log
const handleUpdateTimeLog = async (req, res) => {
  try {
    const { timeLogId } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    const timeLog = await timeLogService.updateTimeLog(timeLogId, userId, updateData);

    res.status(200).json({
      message: "Time log updated successfully",
      data: timeLog,
    });
  } catch (error) {
    console.error("Error updating time log:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error updating time log",
    });
  }
};

// Xóa time log
const handleDeleteTimeLog = async (req, res) => {
  try {
    const { timeLogId } = req.params;
    const userId = req.user._id;

    const result = await timeLogService.deleteTimeLog(timeLogId, userId);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error deleting time log:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error deleting time log",
    });
  }
};

// Lấy thống kê time log của user
const handleGetTimeLogStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    const stats = await timeLogService.getTimeLogStatsByUser(userId, startDate, endDate);

    res.status(200).json({
      message: "Stats retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error getting stats",
    });
  }
};

module.exports = {
  handleCreateTimeLog,
  handleGetTimeLogsByTask,
  handleUpdateTimeLog,
  handleDeleteTimeLog,
  handleGetTimeLogStats,
};
