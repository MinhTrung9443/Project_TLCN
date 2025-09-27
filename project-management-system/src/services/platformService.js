const Platform = require("../models/Platform");
const Project = require("../models/Project");
class PlatformService {
  async getPlatformsByProjectKey(projectKey) {
    try {
      const project = await Project.findOne({ key: projectKey });
      return await Platform.find({ projectId: project ? project._id : null });
    } catch (error) {
      throw new Error("Error fetching platforms by project key");
    }
  }

  async createPlatform(platformData) {
    try {
      const project = await Project.findOne({ key: platformData.projectKey });
      const existingPlatform = await Platform.findOne({
        name: platformData.name,
        projectId: project ? project._id : null,
      });
      if (existingPlatform) {
        throw new Error("Platform with this name already exists.");
      }

      platformData.projectId = project ? project._id : null;
      const newPlatform = new Platform(platformData);
      return await newPlatform.save();
    } catch (error) {
      throw new Error("Error creating platform");
    }
  }

  async updatePlatform(platformId, updateData) {
    try {
      const existingPlatform = await Platform.findOne({
        name: updateData.name,
      });
      if (existingPlatform && existingPlatform._id.toString() !== platformId) {
        return;
      }
      return await Platform.findByIdAndUpdate(platformId, updateData, {
        new: true,
      });
    } catch (error) {
      throw error;
    }
  }

  async deletePlatform(platformId) {
    try {
      return await Platform.findByIdAndDelete(platformId);
    } catch (error) {
      throw new Error("Error deleting platform");
    }
  }

  async getPlatformById(platformId) {
    try {
      return await Platform.findById(platformId);
    } catch (error) {
      throw new Error("Error fetching platform");
    }
  }
}

module.exports = new PlatformService();
