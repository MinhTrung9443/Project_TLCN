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

  // Get team progress statistics
  handleGetTeamProgress: async (req, res) => {
    try {
      const { projectId, teamId } = req.query;
      const userId = req.user._id;

      console.log("handleGetTeamProgress called with:", { userId, projectId, teamId });

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project ID is required",
        });
      }

      const result = await performanceService.getTeamProgress(userId, projectId, teamId);

      console.log("Team progress result:", result);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error in getTeamProgress:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch team progress",
      });
    }
  },

  // Get member progress statistics
  handleGetMemberProgress: async (req, res) => {
    try {
      const { projectId, teamId, memberId } = req.query;
      const userId = req.user._id;

      console.log("handleGetMemberProgress called with:", { userId, projectId, teamId, memberId });

      if (!projectId || !teamId) {
        return res.status(400).json({
          success: false,
          message: "Project ID and Team ID are required",
        });
      }

      const result = await performanceService.getMemberProgress(userId, projectId, teamId, memberId);

      console.log("Member progress result:", result);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error in getMemberProgress:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch member progress",
      });
    }
  },
};

module.exports = PerformanceController;
