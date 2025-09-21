const Platform = require("../models/Platform");

class PlatformService {
  async getAllPlatforms() {
    try {
      return await Platform.find();
    } catch (error) {
      throw new Error("Error fetching platforms");
    }
  }

  async createPlatform(platformData) {
    try {
      const newPlatform = new Platform(platformData);
      return await newPlatform.save();
    } catch (error) {
      throw new Error("Error creating platform");
    }
  }

  async updatePlatform(platformId, updateData) {
    try {
      return await Platform.findByIdAndUpdate(platformId, updateData, {
        new: true,
      });
    } catch (error) {
      throw new Error("Error updating platform");
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
