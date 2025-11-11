const Platform = require("../models/Platform");
const Project = require("../models/Project");
const { logAction } = require("./AuditLogHelper");
class PlatformService {
  async getPlatformsByProjectKey(projectKey) {
    try {
      // Cho trang Global Settings
      if (!projectKey) {
        return await Platform.find({ projectId: null });
      }

      // Cho trang Project Settings
      const project = await Project.findOne({ key: projectKey });
      if (!project) throw new Error("Project not found");

      const projectPlatforms = await Platform.find({ projectId: project._id });

      return projectPlatforms;
    } catch (error) {
      console.error("Error fetching platforms:", error);
      throw new Error("Error fetching platforms");
    }
  }

  async createPlatform(platformData, userId) {
    try {
      const project = platformData.projectKey ? await Project.findOne({ key: platformData.projectKey }) : null;
      const projectId = project ? project._id : null;

      const existingPlatform = await Platform.findOne({
        name: platformData.name,
        projectId: projectId,
      });
      if (existingPlatform) {
        throw new Error("Platform with this name already exists.");
      }

      const newPlatform = new Platform({ ...platformData, projectId });
      await newPlatform.save();
      await logAction({
        userId,
        action: "create_platform",
        tableName: "Platform",
        recordId: newPlatform._id,
        newData: newPlatform,
      });
      return newPlatform;
    } catch (error) {
      throw new Error("Error creating platform: " + error.message);
    }
  }

  async updatePlatform(platformId, updateData, userId) {
    try {
      const platformToUpdate = await Platform.findById(platformId);
      if (!platformToUpdate) {
        throw new Error("Platform not found.");
      }
      const oldPlatform = platformToUpdate.toObject();

      const existingPlatform = await Platform.findOne({
        name: updateData.name,
        projectId: platformToUpdate.projectId, // Chỉ kiểm tra trong cùng scope
        _id: { $ne: platformId }, // Loại trừ chính nó ra khỏi việc kiểm tra
      });

      if (existingPlatform) {
        throw new Error("Platform with this name already exists in this project.");
      }
      await Platform.findByIdAndUpdate(platformId, updateData, { new: true });
      await logAction({
        userId,
        action: "update_platform",
        tableName: "Platform",
        recordId: platformToUpdate._id,
        oldData: oldPlatform,
        newData: platformToUpdate,
      });
      return platformToUpdate;
    } catch (error) {
      throw error;
    }
  }

  async deletePlatform(platformId) {
    try {
      const result = await Platform.findByIdAndDelete(platformId);
      if (!result) {
        const error = new Error("Platform not found");
        error.statusCode = 404;
        throw error;
      }
      return result;
    } catch (error) {
      throw error;
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
