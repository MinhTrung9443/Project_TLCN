const Priority = require("../models/Priority");

class PriorityService {
  async getAllPriorities() {
    try {
      return await Priority.find();
    } catch (error) {
      throw new Error("Error fetching priorities");
    }
  }

  async createPriority(data) {
    try {
      const existingPriority = await Priority.findOne({ name: data.name });
      if (existingPriority) {
        throw new Error("Priority with this name already exists.");
      }
      // Tìm priority có level lớn nhất
      const maxPriority = await Priority.findOne({
        projectId: data.projectId,
      }).sort({
        level: -1,
      });
      const nextLevel = maxPriority ? maxPriority.level + 1 : 1;
      const priority = new Priority({ ...data, level: nextLevel });
      return await priority.save();
    } catch (error) {
      throw error;
    }
  }

  async updatePriority(id, data) {
    try {
      const existingPriority = await Priority.findOne({ name: data.name });
      if (existingPriority && existingPriority._id.toString() !== id) {
        throw new Error("Priority with this name already exists.");
      }
      return await Priority.findByIdAndUpdate(id, data, { new: true });
    } catch (error) {
      throw new Error("Error updating priority");
    }
  }

  async deletePriority(id) {
    try {
      return await Priority.findByIdAndDelete(id);
    } catch (error) {
      throw new Error("Error deleting priority");
    }
  }
  async getPriorityById(id) {
    try {
      return await Priority.findById(id);
    } catch (error) {
      throw new Error("Error fetching priority");
    }
  }

  async updatePriorityLevels(items) {
    try {
      const updatePromises = items.map((item) =>
        Priority.findByIdAndUpdate(
          item._id,
          { level: item.level },
          { new: true }
        )
      );
      await Promise.all(updatePromises);
      return { message: "Priority levels updated successfully" };
    } catch (error) {
      throw new Error("Error updating priority levels");
    }
  }
}

module.exports = new PriorityService();
