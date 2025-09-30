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

      const newSprint = await sprintService.createSprint(projectKey);
      res.status(201).json(newSprint);
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
  },
  handleUpdateSprint: async (req, res) => {
    try {
      const { sprintId } = req.params;
      const sprintData = req.body;
      const updatedSprint = await sprintService.updateSprint(sprintId, sprintData);
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
};
module.exports = SprintController;
