const projectReportService = require("../services/ProjectReportService");

const ProjectReportController = {
  getLatestProjectReportByProjectKey: async (req, res) => {
    try {
      const { projectKey } = req.params;
      const report = await projectReportService.getLatestProjectReportByProject({
        projectKey,
        user: req.user,
      });

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error("Error fetching latest project report by key:", error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to fetch latest project report",
      });
    }
  },

  getLatestProjectReportByProjectId: async (req, res) => {
    try {
      const { projectId } = req.params;
      const report = await projectReportService.getLatestProjectReportByProject({
        projectId,
        user: req.user,
      });

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error("Error fetching latest project report by id:", error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to fetch latest project report",
      });
    }
  },

  generateProjectReportByProjectKey: async (req, res) => {
    try {
      const { projectKey } = req.params;
      const report = await projectReportService.generateProjectReportFromProject({
        projectKey,
        user: req.user,
      });

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error("Error generating project report by key:", error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to generate project report",
      });
    }
  },

  generateProjectReportByProjectId: async (req, res) => {
    try {
      const { projectId } = req.params;
      const report = await projectReportService.generateProjectReportFromProject({
        projectId,
        user: req.user,
      });

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error("Error generating project report by id:", error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to generate project report",
      });
    }
  },

  generateProjectReport: async (req, res) => {
    try {
      const payload = req.body?.data || req.body || {};

      if (!payload || typeof payload !== "object") {
        return res.status(400).json({
          success: false,
          message: "A structured JSON payload is required.",
        });
      }

      const report = await projectReportService.generateProjectReport(payload);

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error("Error generating project report:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to generate project report",
      });
    }
  },
};

module.exports = ProjectReportController;
