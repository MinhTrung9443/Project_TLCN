const priorityService = require("../services/PriorityService.js");
const { isProjectCompletedByKey } = require("../utils/projectValidation");

class PriorityController {
  async getAllPriorities(req, res) {
    try {
      const { projectKey } = req.query;
      const priorities = await priorityService.getPrioritiesByProjectKey(projectKey);
      return res.status(200).json(priorities);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async createPriority(req, res) {
    try {
      const userId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;

      // Check if project is completed
      if (req.body.projectKey && (await isProjectCompletedByKey(req.body.projectKey))) {
        return res.status(403).json({ message: "Cannot create priorities in a completed project" });
      }

      const priority = await priorityService.createPriority(req.body, userId);
      res.status(200).json(priority);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updatePriority(req, res) {
    try {
      const userId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;

      // Check if priority belongs to a completed project
      const Priority = require("../models/Priority");
      const priority = await Priority.findById(req.params.id).populate("projectId");
      if (priority && priority.projectId && priority.projectId.status === "completed") {
        return res.status(403).json({ message: "Cannot update priorities in a completed project" });
      }

      const updatedPriority = await priorityService.updatePriority(req.params.id, req.body, userId);
      res.status(200).json(updatedPriority);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async deletePriority(req, res) {
    try {
      // Check if priority belongs to a completed project
      const Priority = require("../models/Priority");
      const priority = await Priority.findById(req.params.id).populate("projectId");
      if (priority && priority.projectId && priority.projectId.status === "completed") {
        return res.status(403).json({ message: "Cannot delete priorities in a completed project" });
      }

      await priorityService.deletePriority(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  async getPriorityById(req, res) {
    try {
      const priority = await priorityService.getPriorityById(req.params.id);
      if (!priority) {
        return res.status(404).json({ message: "Priority not found" });
      }
      res.status(200).json(priority);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updatePriorityLevels(req, res) {
    try {
      const { projectKey } = req.params;
      const { items } = req.body;

      await priorityService.updatePriorityLevels(projectKey, items);

      console.log(`Priority levels updated for project ${projectKey}:`, items);
      res.status(200).json({ message: "Priority levels updated successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
      console.error("Error updating priority levels:", error);
    }
  }
  async getPriorityList(req, res) {
    try {
      const priorities = await priorityService.getAllPrioritiesList();
      return res.status(200).json(priorities);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = new PriorityController();
