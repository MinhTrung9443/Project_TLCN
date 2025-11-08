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

  getWorkflowByProject: async (projectKey) => {
    try {
      const response = await apiClient.get(`/workflows/project/${projectKey}`);
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
  getStatusList: async () => {
    try {
      const response = await apiClient.get("/workflows/list");
      return response;
    } catch (error) {
      console.error("Error fetching statuses:", error);
      throw error;
    }
  },

  // Statuses management
  addStatus: async (projectKey, statusData) => {
    try {
      const response = await apiClient.post(`/workflows/${projectKey}/statuses`, statusData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateStatus: async (projectKey, statusId, statusData) => {
    try {
      const response = await apiClient.put(`/workflows/${projectKey}/statuses/${statusId}`, statusData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteStatus: async (projectKey, statusId) => {
    try {
      const response = await apiClient.delete(`/workflows/${projectKey}/statuses/${statusId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Transitions management
  addTransition: async (projectKey, transitionData) => {
    try {
      const response = await apiClient.post(`/workflows/${projectKey}/transitions`, transitionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTransition: async (projectKey, transitionId, transitionData) => {
    try {
      const response = await apiClient.put(`/workflows/${projectKey}/transitions/${transitionId}`, transitionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteTransition: async (projectKey, transitionId) => {
    try {
      const response = await apiClient.delete(`/workflows/${projectKey}/transitions/${transitionId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default workflowService;
