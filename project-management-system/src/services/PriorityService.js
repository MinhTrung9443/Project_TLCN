const Priority = require("../models/Priority");
const Project = require("../models/Project");
class PriorityService {
  async getPrioritiesByProjectKey(projectKey) {
    try {
      const project = await Project.findOne({ key: projectKey });
      return await Priority.find({ projectId: project ? project._id : null });
    } catch (error) {
      throw new Error("Error fetching priorities by project key");
    }
  }

  async createPriority(data) {
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
