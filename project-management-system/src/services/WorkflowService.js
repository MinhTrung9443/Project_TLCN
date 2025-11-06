const Workflow = require("../models/Workflow");
const Project = require("../models/Project");

class WorkflowService {
  async getDefaultWorkflow() {
    try {
      const workflow = await Workflow.findOne({ isDefault: true });
      if (!workflow) {
        throw new Error("No default workflow found");
      }
      return workflow;
    } catch (error) {
      throw error;
    }
  }

  async getWorkflowByProject(projectKey) {
    try {
      // Find project by key
      const project = await Project.findOne({ key: projectKey.toUpperCase() });
      if (!project) {
        throw new Error("Project not found");
      }

      // Find workflow for this project
      const workflow = await Workflow.findOne({ projectId: project._id });
      if (!workflow) {
        // Fallback to default workflow if project doesn't have one
        return await this.getDefaultWorkflow();
      }
      return workflow;
    } catch (error) {
      throw error;
    }
  }

  async getWorkflowById(workflowId) {
    try {
      const workflow = await Workflow.findById(workflowId);
      if (!workflow) {
        throw new Error("Workflow not found");
      }
      return workflow;
    } catch (error) {
      throw error;
    }
  }
  async getAllStatuses() {
    try {
      const defaultWorkflow = await Workflow.findOne({ isDefault: true });

      if (!defaultWorkflow) {
        throw new Error("Default workflow not found. Cannot get status list.");
      }

      return defaultWorkflow.statuses || [];
    } catch (error) {
      console.error("Error in getAllStatuses:", error);
      throw error;
    }
  }
}

module.exports = new WorkflowService();
