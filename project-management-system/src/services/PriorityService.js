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
      const priority = new Priority(data);
      return await priority.save();
    } catch (error) {
      throw new Error("Error creating priority");
    }
  }

  async updatePriority(id, data) {
    try {
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
}

module.exports = new PriorityService();
