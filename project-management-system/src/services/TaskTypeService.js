const TaskType = require("../models/TaskType.js");
const Project = require("../models/Project.js");
const { logAction } = require("./AuditLogHelper");
class TaskTypeService {
  // Create a new task type
  async createTaskType(data, userId) {
    try {
      const project = await Project.findOne({ key: data.projectKey });
      const typeName = data.name.trim();
      const existingType = await TaskType.findOne({
        name: typeName,
        projectId: project ? project._id : null,
      });
      if (existingType) {
        throw new Error("Task type with this name already exists.");
      }

      const newTaskType = await TaskType.create({
        ...data,
        projectId: project ? project._id : null,
      });
      await logAction({
        userId,
        action: "create_tasktype",
        tableName: "TaskType",
        recordId: newTaskType._id,
        newData: newTaskType,
      });
      return newTaskType;
    } catch (error) {
      console.error("Error creating task type:", error);
      throw error;
    }
  }
  // get task types by project key
  async getTaskTypesByProjectKey(projectKey) {
    try {
      const project = await Project.findOne({ key: projectKey });
      const taskTypes = await TaskType.find({
        projectId: project ? project._id : null,
      });
      return taskTypes;
    } catch (error) {
      console.error("Error fetching task types by project key:", error);
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
  async updateTaskType(id, data, userId) {
    try {
      // 1. Lấy document gốc để biết projectId
      const taskTypeToUpdate = await TaskType.findById(id);
      if (!taskTypeToUpdate) {
        throw new Error("Task type not found.");
      }
      const oldTaskType = taskTypeToUpdate.toObject();

      // 2. Kiểm tra tên trùng lặp trong cùng scope (cùng projectId)
      const existingType = await TaskType.findOne({
        name: data.name,
        projectId: taskTypeToUpdate.projectId, // Chỉ tìm trong scope này
        _id: { $ne: id }, // Loại trừ chính nó
      });

      if (existingType) {
        throw new Error("A task type with this name already exists in this project.");
      }

      // 3. Nếu không trùng, tiến hành cập nhật
      await taskTypeToUpdate.save();
      await logAction({
        userId,
        action: "update_tasktype",
        tableName: "TaskType",
        recordId: taskTypeToUpdate._id,
        oldData: oldTaskType,
        newData: taskTypeToUpdate,
      });
      return taskTypeToUpdate;
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
  async getAllTaskTypes() {
    // Tên hàm có thể khác, ví dụ getSystemTaskTypes
    try {
      const taskTypes = await TaskType.find({})
        .populate("projectId", "name key") // <-- QUAN TRỌNG: Lấy thêm name và key của project
        .sort({ order: "asc" }); // Nếu bạn có trường order
      return taskTypes;
    } catch (error) {
      console.error("Error fetching all task types:", error);
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
