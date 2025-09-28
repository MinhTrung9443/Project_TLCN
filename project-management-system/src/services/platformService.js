const Platform = require("../models/Platform");
const Project = require("../models/Project");
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

      // Nếu đã có bộ riêng, trả về
      if (projectPlatforms.length > 0) {
        return projectPlatforms;
      }

      // Nếu chưa có, sao chép từ global
      const globalPlatforms = await Platform.find({ projectId: null });
      if (globalPlatforms.length === 0) return [];

      const newPlatformsForProject = globalPlatforms.map(p => {
        const platformCopy = p.toObject();
        delete platformCopy._id;
        platformCopy.projectId = project._id;
        return platformCopy;
      });

      return await Platform.insertMany(newPlatformsForProject);

    } catch (error) {
      console.error("Error fetching platforms:", error);
      throw new Error("Error fetching platforms");
    }
  }

  async createPlatform(platformData) {
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
      return await newPlatform.save();
    } catch (error) {
      throw new Error("Error creating platform: " + error.message);
    }
  }

  async updatePlatform(platformId, updateData) {
        try {
            const platformToUpdate = await Platform.findById(platformId);
            if (!platformToUpdate) {
                throw new Error("Platform not found.");
            }

            const existingPlatform = await Platform.findOne({
                name: updateData.name,
                projectId: platformToUpdate.projectId, // Chỉ kiểm tra trong cùng scope
                _id: { $ne: platformId } // Loại trừ chính nó ra khỏi việc kiểm tra
            });
            
            if (existingPlatform) {
                throw new Error("Platform with this name already exists in this project.");
            }
            return await Platform.findByIdAndUpdate(platformId, updateData, { new: true });
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
