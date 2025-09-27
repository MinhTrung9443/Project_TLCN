import apiClient from "./apiClient";

const typeTaskService = {
  getAllTypeTask: (projectKey) => {
    const url = `/task-types?projectKey=${projectKey}`;
    try {
      const response = apiClient.get(url);
      return response;
    } catch (error) {
      console.error("Error fetching task types:", error);
      throw error;
    }
  },
  createTypeTask: (data) => {
    const url = "/task-types";
    try {
      const response = apiClient.post(url, data);
      if (response?.data?.error) {
      }
      return response;
    } catch (error) {
      console.error("Error creating task type:", error);
      throw error;
    }
  },
  updateTypeTask: (id, data) => {
    const url = `/task-types/${id}`;
    try {
      const response = apiClient.put(url, data);
      return response;
    } catch (error) {
      console.error("Error updating task type:", error);
      throw error;
    }
  },
  deleteTypeTask: (id) => {
    const url = `/task-types/${id}`;
    try {
      const response = apiClient.delete(url);
      return response;
    } catch (error) {
      console.error("Error deleting task type:", error);
      throw error;
    }
  },
  getTypeTaskById: (id) => {
    const url = `/task-types/${id}`;
    try {
      const response = apiClient.get(url);
      return response;
    } catch (error) {
      console.error("Error fetching task type by ID:", error);
      throw error;
    }
  },
};

export default typeTaskService;
