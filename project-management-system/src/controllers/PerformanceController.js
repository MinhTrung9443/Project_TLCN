const performanceService = require("../services/PerformanceService");

const PerformanceController = {
  // Lấy thống kê hiệu suất của user trong project
  handleGetUserPerformance: async (req, res) => {
    try {
      const { userId, projectId } = req.params;
      const { startDate, endDate } = req.query;

      // Validate userId và projectId
      if (!userId || userId === "undefined" || userId === "null") {
        return res.status(400).json({
          success: false,
          message: "Invalid userId parameter",
        });
      }

      if (!projectId || projectId === "undefined" || projectId === "null") {
        return res.status(400).json({
          success: false,
          message: "Invalid projectId parameter",
        });
      }

      const performance = await performanceService.getUserPerformanceInProject(userId, projectId, {
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data: performance,
      });
    } catch (error) {
      console.error("Error getting user performance:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get user performance",
      });
    }
  },

  // Lấy top performers trong project
  handleGetTopPerformers: async (req, res) => {
    try {
      const { projectId } = req.params;
      const { limit } = req.query;

      const performers = await performanceService.getTopPerformers(projectId, limit ? parseInt(limit) : 10);

      res.status(200).json({
        success: true,
        data: performers,
      });
    } catch (error) {
      console.error("Error getting top performers:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get top performers",
      });
    }
  },

  // Lấy time logs của user
  handleGetUserTimeLogs: async (req, res) => {
    try {
      const { userId, projectId } = req.params;
      const { startDate, endDate, limit } = req.query;

      const timeLogs = await performanceService.getUserTimeLogs(userId, projectId, {
        startDate,
        endDate,
        limit: limit ? parseInt(limit) : 50,
      });

      res.status(200).json({
        success: true,
        data: timeLogs,
      });
    } catch (error) {
      console.error("Error getting user time logs:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get user time logs",
      });
    }
  },
};

module.exports = PerformanceController;
