const TaskType = require("../models/TaskType.js");

class TaskTypeService {
  // Create a new task type
  async createTaskType(data) {
    const newTaskType = await TaskType.create(data);
    return newTaskType;
  }
  // Get all task types
  async getAllTaskTypes() {
    const taskTypes = await TaskType.findAll();
    return taskTypes;
  }
  // Get a task type by ID
  async getTaskTypeById(id) {
    const taskType = await TaskType.findByPk(id);
    return taskType;
  }
  // Update a task type by ID
  async updateTaskType(id, data) {
    const taskType = await TaskType.findByPk(id);
    if (!taskType) {
      return null;
    }
    await taskType.update(data);
    return taskType;
  }
  // Delete a task type by ID
  async deleteTaskType(id) {
    const taskType = await TaskType.findByPk(id);
    if (!taskType) {
      return null;
    }
    await taskType.destroy();
    return taskType;
  }
  // get task types by project ID
  async getTaskTypesByProjectId(projectId) {
    const taskTypes = await TaskType.findAll({ where: { projectId } });
    return taskTypes;
  }
}

module.exports = new TaskTypeService();
