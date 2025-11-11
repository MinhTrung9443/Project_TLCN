const Priority = require("../models/Priority");
const Project = require("../models/Project");
const { logAction } = require("./AuditLogHelper");
class PriorityService {
  async getPrioritiesByProjectKey(projectKey) {
    try {
      // 1. Nếu không có projectKey -> lấy global (cho trang Settings chung)
      if (!projectKey) {
        return await Priority.find({ projectId: null }).sort({ level: "asc" });
      }

      // 2. Nếu có projectKey -> xử lý cho Project Settings
      const project = await Project.findOne({ key: projectKey });
      if (!project) {
        throw new Error("Project not found");
      }

      const projectPriorities = await Priority.find({ projectId: project._id }).populate("projectId", "name key");

      return projectPriorities.sort((a, b) => a.level - b.level);
    } catch (error) {
      console.error("Error in getPrioritiesByProjectKey:", error);
      throw new Error("Error fetching priorities");
    }
  }

  async createPriority(data, userId) {
    try {
      const project = await Project.findOne({ key: data.projectKey });
      const existingPriority = await Priority.findOne({
        name: data.name,
        projectId: project ? project._id : null,
      });
      if (existingPriority) {
        throw new Error("Priority with this name already exists.");
      }
      // Tìm priority có level lớn nhất
      const maxPriority = await Priority.findOne({
        projectId: project ? project._id : null,
      }).sort({
        level: -1,
      });
      const nextLevel = maxPriority ? maxPriority.level + 1 : 1;

      const priority = new Priority({
        ...data,
        level: nextLevel,
        projectId: project ? project._id : null,
      });
      await priority.save();
      await logAction({
        userId,
        action: "create_priority",
        tableName: "Priority",
        recordId: priority._id,
        newData: priority,
      });
      return priority;
    } catch (error) {
      throw error;
    }
  }

  async updatePriority(id, data, userId) {
    try {
      // 1. Lấy document gốc để biết projectId của nó là gì
      const priorityToUpdate = await Priority.findById(id);
      if (!priorityToUpdate) {
        throw new Error("Priority not found.");
      }
      const oldPriority = priorityToUpdate.toObject();

      // 2. Kiểm tra xem có document NÀO KHÁC trong CÙNG SCOPE (cùng projectId)
      // đã có tên mới này chưa.
      const existingPriority = await Priority.findOne({
        name: data.name,
        projectId: priorityToUpdate.projectId, // Chỉ tìm trong cùng project hoặc cùng global
        _id: { $ne: id }, // Loại trừ chính document đang sửa
      });

      if (existingPriority) {
        throw new Error("A priority with this name already exists in this project.");
      }

      // 3. Nếu không trùng, tiến hành cập nhật
      Object.assign(priorityToUpdate, data);
      await priorityToUpdate.save();
      await logAction({
        userId,
        action: "update_priority",
        tableName: "Priority",
        recordId: priorityToUpdate._id,
        oldData: oldPriority,
        newData: priorityToUpdate,
      });
      return priorityToUpdate;
    } catch (error) {
      // Ném lỗi ra để Controller và Frontend có thể bắt được
      throw error;
    }
  }

  async deletePriority(id) {
    try {
      const result = await Priority.findByIdAndDelete(id);
      if (!result) {
        const error = new Error("Priority not found");
        error.statusCode = 404;
        throw error;
      }
      return result;
    } catch (error) {
      throw error;
    }
  }
  async getPriorityById(id) {
    try {
      return await Priority.findById(id);
    } catch (error) {
      throw new Error("Error fetching priority");
    }
  }

  async updatePriorityLevels(projectKey, items) {
    try {
      const project = await Project.findOne({ key: projectKey });

      const updatePromises = items.map((item, index) =>
        Priority.updateOne(
          { _id: item._id, projectId: { $in: [project ? project._id : null, null] } }, // Chỉ update item thuộc project hoặc global
          { $set: { level: index + 1 } }
        )
      );
      await Promise.all(updatePromises);
      return { message: "Priority levels updated successfully" };
    } catch (error) {
      console.error("Error updating priority levels:", error);
      throw new Error("Error updating priority levels");
    }
  }
  async getAllPrioritiesList() {
    try {
      // Lấy tất cả priorities, không phân biệt project
      return await Priority.find({}).sort({ name: "asc" });
    } catch (error) {
      console.error("Error in getAllPrioritiesList:", error);
      throw new Error("Error fetching all priorities");
    }
  }
}

module.exports = new PriorityService();
