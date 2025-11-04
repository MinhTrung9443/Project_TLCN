const taskTypeService = require("../services/TaskTypeService.js");

class TaskTypeController {
  // Create a new task type
  async createTaskType(req, res) {
    try {
      const { name, description, icon, projectKey } = req.body;
      const userId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;
      const newTaskType = await taskTypeService.createTaskType(
        {
          name,
          description,
          icon,
          projectKey,
        },
        userId
      );
      res.status(201).json(newTaskType);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get all task types
  async getAllTaskTypes(req, res) {
    try {
      const { projectKey } = req.query;
      const taskTypes = await taskTypeService.getTaskTypesByProjectKey(projectKey);
      return res.status(200).json(taskTypes);
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
      const { name, description, icon, projectId } = req.body;
      const userId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;
      const updatedTaskType = await taskTypeService.updateTaskType(
        id,
        {
          name,
          description,
          icon,
          projectId,
        },
        userId
      );
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
      await taskTypeService.deleteTaskType(id);
      res.status(200).json({ message: "Task type deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new TaskTypeController();
