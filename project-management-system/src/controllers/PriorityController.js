const priorityService = require("../services/PriorityService.js");

class PriorityController {
  
  async getAllPriorities(req, res) {
    try {
      const { projectKey } = req.query;
      const priorities = await priorityService.getPrioritiesByProjectKey(
        projectKey
      );
      return res.status(200).json(priorities);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async createPriority(req, res) {
    try {
      const priority = await priorityService.createPriority(req.body);
      res.status(200).json(priority);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updatePriority(req, res) {
    try {
      const priority = await priorityService.updatePriority(
        req.params.id,
        req.body
      );
      res.status(200).json(priority);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async deletePriority(req, res) {
    try {
      await priorityService.deletePriority(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  async getPriorityById(req, res) {
    try {
      const priority = await priorityService.getPriorityById(req.params.id);
      if (!priority) {
        return res.status(404).json({ message: "Priority not found" });
      }
      res.status(200).json(priority);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updatePriorityLevels(req, res) {
    try {
      const { projectKey } = req.params; 
      const { items } = req.body;
      
      await priorityService.updatePriorityLevels(projectKey, items); 
      
      console.log(`Priority levels updated for project ${projectKey}:`, items);
      res.status(200).json({ message: "Priority levels updated successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
      console.error("Error updating priority levels:", error);
    }
  }
  async getPriorityList(req, res) {
    try {
      const priorities = await priorityService.getAllPrioritiesList();
      return res.status(200).json(priorities);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

}

module.exports = new PriorityController();