const workflowService = require("../services/WorkflowService");

class WorkflowController {
  async getDefaultWorkflow(req, res) {
    try {
      const workflow = await workflowService.getDefaultWorkflow();
      res.status(200).json(workflow);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getWorkflowById(req, res) {
    try {
      const { workflowId } = req.params;
      const workflow = await workflowService.getWorkflowById(workflowId);
      res.status(200).json(workflow);
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
  async getAllStatuses(req, res) {
    try {
      const statuses = await workflowService.getAllStatuses();
      res.status(200).json(statuses);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  
}

module.exports = new WorkflowController();
