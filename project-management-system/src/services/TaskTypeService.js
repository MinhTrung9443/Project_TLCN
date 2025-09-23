const TaskType = require("../models/TaskType.js");

class TaskTypeService {
  // Create a new task type
  async createTaskType(data) {
    try {
      const newTaskType = await TaskType.create(data);
      return newTaskType;
    } catch (error) {
      console.error("Error creating task type:", error);
      throw error;
    }
  }
  // Get all task types
  async getAllTaskTypes() {
    try {
      const taskTypes = await TaskType.find();
      return taskTypes;
    } catch (error) {
      console.error("Error fetching all task types:", error);
      throw error;
    }
  }
  // Get a task type by ID
  async getTaskTypeById(id) {
    try {
      // Lấy theo id
      const taskType = await TaskType.findById(id);
      return taskType;
    } catch (error) {
      console.error("Error fetching task type by ID:", error);
      throw error;
    }
  }
  // Update a task type by ID
  async updateTaskType(id, data) {
    try {
      // Update
      const updated = await TaskType.findByIdAndUpdate(id, data, { new: true });
      return updated;
    } catch (error) {
      console.error("Error updating task type:", error);
      throw error;
    }
  }
  // Delete a task type by ID
  async deleteTaskType(id) {
    try {
      await TaskType.findByIdAndDelete({ _id: id });
    } catch (error) {
      console.error("Error deleting task type:", error);
      throw error;
    }
  }

  // get task types by project ID
  async getTaskTypesByProjectId(projectId) {
    try {
      const taskTypes = await TaskType.findAll({ where: { projectId } });
      return taskTypes;
    } catch (error) {
      console.error("Error fetching task types by project ID:", error);
      throw error;
    }
  }
}

module.exports = new TaskTypeService();
