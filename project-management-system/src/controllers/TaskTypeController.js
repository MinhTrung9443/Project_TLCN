const taskTypeService = require("../services/TaskTypeService.js");

class TaskTypeController {
  // Create a new task type
  async createTaskType(req, res) {
    try {
      const { name, description, icon, projectId } = req.body;
      const newTaskType = await taskTypeService.createTaskType({
        name,
        description,
        icon,
        projectId,
      });
      res.status(201).json(newTaskType);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get all task types
  async getAllTaskTypes(req, res) {
    try {
      const taskTypes = await taskTypeService.getAllTaskTypes();
      res.status(200).json(taskTypes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get a task type by ID
  async getTaskTypeById(req, res) {
    try {
      const { id } = req.params;

      const taskType = await taskTypeService.getTaskTypeById(id);
      if (!taskType) {
        return res.status(404).json({ error: "Task type not found" });
      }
      res.status(200).json(taskType);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  // Update a task type by ID
  async updateTaskType(req, res) {
    try {
      const { id } = req.params;
      const { name, description, icon } = req.body;
      const updatedTaskType = await taskTypeService.updateTaskType(id, {
        name,
        description,
        icon,
      });
      if (!updatedTaskType) {
        return res.status(404).json({ error: "Task type not found" });
      }
      res.status(200).json(updatedTaskType);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Delete a task type by ID
  async deleteTaskType(req, res) {
    try {
      const { id } = req.params;
      const deleted = await taskTypeService.deleteTaskType(id);
      if (!deleted) {
        return res.status(404).json({ error: "Task type not found" });
      }
      res.status(200).json({ message: "Task type deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new TaskTypeController();
