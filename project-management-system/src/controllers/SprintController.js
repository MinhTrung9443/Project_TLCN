const sprintService = require("../services/SprintService.js");

const SprintController = {
  handleGetSprintsByProjectKey: async (req, res) => {
    try {
      const { projectKey } = req.params;
      const { sprint, tasksWithoutSprint } = await sprintService.getSprintsByProjectKey(projectKey);
      res.status(200).json({ sprint, tasksWithoutSprint });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
  },
  handleCreateSprint: async (req, res) => {
    try {
      const { projectKey } = req.params;
      const userId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;
      const newSprint = await sprintService.createSprint(projectKey, userId);
      res.status(201).json(newSprint);
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
  },
  handleUpdateSprint: async (req, res) => {
    try {
      const { sprintId } = req.params;
      const sprintData = req.body;
      const userId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;
      const updatedSprint = await sprintService.updateSprint(sprintId, sprintData, userId);
      res.status(200).json(updatedSprint);
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
  },
  handleDeleteSprint: async (req, res) => {
    try {
      const { sprintId } = req.params;
      await sprintService.deleteSprint(sprintId);
      res.status(200).json({ message: "Sprint deleted successfully" });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
  },

  handleGetStartedSprints: async (req, res) => {
    try {
      const { projectKey } = req.params;
      const startedSprints = await sprintService.getStartedSprintsByProjectKey(projectKey);
      res.status(200).json(startedSprints);
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
  },

  handleGetTasksBySprintWithStatus: async (req, res) => {
    try {
      const { sprintId } = req.params;
      const result = await sprintService.getTasksBySprintWithStatus(sprintId);
      res.status(200).json(result);
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
  },
};
module.exports = SprintController;
