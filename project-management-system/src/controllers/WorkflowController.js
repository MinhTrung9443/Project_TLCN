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

  async getWorkflowByProject(req, res) {
    try {
      const { projectKey } = req.params;
      const workflow = await workflowService.getWorkflowByProject(projectKey);
      res.status(200).json(workflow);
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
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

  // ============================================
  // STATUSES MANAGEMENT
  // ============================================

  async addStatus(req, res) {
    try {
      const { projectKey } = req.params;
      const { name, category } = req.body;

      const result = await workflowService.addStatus(projectKey, { name, category });
      res.status(201).json({
        message: "Status added successfully",
        status: result.status,
        workflow: result.workflow,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const { projectKey, statusId } = req.params;
      const { name, category } = req.body;

      const result = await workflowService.updateStatus(projectKey, statusId, { name, category });
      res.status(200).json({
        message: "Status updated successfully",
        status: result.status,
        workflow: result.workflow,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async deleteStatus(req, res) {
    try {
      const { projectKey, statusId } = req.params;

      const result = await workflowService.deleteStatus(projectKey, statusId);
      res.status(200).json({
        message: "Status deleted successfully",
        workflow: result.workflow,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  // ============================================
  // TRANSITIONS (RULES) MANAGEMENT
  // ============================================

  async addTransition(req, res) {
    try {
      const { projectKey } = req.params;
      const { from, to, name } = req.body;

      const result = await workflowService.addTransition(projectKey, { from, to, name });
      res.status(201).json({
        message: "Transition added successfully",
        transition: result.transition,
        workflow: result.workflow,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async updateTransition(req, res) {
    try {
      const { projectKey, transitionId } = req.params;
      const { from, to, name } = req.body;

      const result = await workflowService.updateTransition(projectKey, transitionId, { from, to, name });
      res.status(200).json({
        message: "Transition updated successfully",
        transition: result.transition,
        workflow: result.workflow,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async deleteTransition(req, res) {
    try {
      const { projectKey, transitionId } = req.params;

      const result = await workflowService.deleteTransition(projectKey, transitionId);
      res.status(200).json({
        message: "Transition deleted successfully",
        workflow: result.workflow,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
}

module.exports = new WorkflowController();
