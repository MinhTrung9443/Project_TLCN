const platformService = require("../services/platformService.js");

class PlatformController {
  async getAllPlatforms(req, res) {
    try {
      const { projectKey } = req.query;
      const platforms = await platformService.getPlatformsByProjectKey(projectKey);
      return res.status(200).json(platforms);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async createPlatform(req, res) {
    try {
      const platformData = req.body;
      const userId = req.user && req.user._id ? req.user._id : undefined;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized: userId missing" });
      }
      const newPlatform = await platformService.createPlatform(platformData, userId);
      res.status(201).json({
        message: "Platform created successfully",
        platform: newPlatform,
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  async updatePlatform(req, res) {
    try {
      const platformId = req.params.id;
      const updateData = req.body;
      const userId = req.user && req.user._id ? req.user._id : undefined;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized: userId missing" });
      }
      const updatedPlatform = await platformService.updatePlatform(platformId, updateData, userId);
      res.status(200).json({
        message: "Platform updated successfully",
        platform: updatedPlatform,
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  async deletePlatform(req, res) {
    try {
      const platformId = req.params.id;
      await platformService.deletePlatform(platformId);
      res.status(200).json({ message: "Platform deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  async getPlatformById(req, res) {
    try {
      const platformId = req.params.id;
      const platform = await platformService.getPlatformById(platformId);
      res.status(200).json(platform);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new PlatformController();
