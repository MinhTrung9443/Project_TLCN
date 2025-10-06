import apiClient from "./apiClient";

const workflowService = {
  getDefaultWorkflow: async () => {
    try {
      const response = await apiClient.get("/workflows/default");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getWorkflowById: async (workflowId) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default workflowService;
