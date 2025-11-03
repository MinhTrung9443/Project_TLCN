const Workflow = require("../models/Workflow");

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
