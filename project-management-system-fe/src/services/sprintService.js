import apiClient from "./apiClient";

const sprintService = {
  createSprint: async (projectKey) => {
    try {
      const response = await apiClient.post(`/sprints/${projectKey}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getSprints: async (projectKey) => {
    try {
      const response = await apiClient.get(`/sprints/${projectKey}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getSprintById: async (sprintId) => {
    try {
      const response = await apiClient.get(`/sprints/id/${sprintId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateSprint: async (sprintId, sprintData) => {
    try {
      const response = await apiClient.put(`/sprints/${sprintId}`, sprintData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteSprint: async (sprintId) => {
    try {
      const response = await apiClient.delete(`/sprints/${sprintId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTaskSprint: async (taskId, sprintId) => {
    try {
      const response = await apiClient.put(`/sprints/tasks/${taskId}/sprint`, { sprintId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getStartedSprints: async (projectKey) => {
    try {
      const response = await apiClient.get(`/sprints/${projectKey}/started`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTasksBySprintWithStatus: async (sprintId) => {
    try {
      const response = await apiClient.get(`/sprints/tasks/${sprintId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  getSprintList: async () => {
    try {
      const response = await apiClient.get(`/sprints/list`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
export default sprintService;
