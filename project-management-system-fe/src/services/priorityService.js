import apiClient from "./apiClient";

const priorityService = {
  getAllPriorities: async () => {
    try {
      const response = await apiClient.get("/priorities");
      return response;
    } catch (error) {
      console.error("Error fetching priorities:", error);
      throw error;
    }
  },
  createPriority: async (data) => {
    try {
      const response = await apiClient.post("/priorities", data);
      return response;
    } catch (error) {
      console.error("Error creating priority:", error);
      throw error;
    }
  },
  updatePriority: async (id, data) => {
    try {
      const response = await apiClient.put(`/priorities/${id}`, data);
      return response;
    } catch (error) {
      console.error("Error updating priority:", error);
      throw error;
    }
  },
  deletePriority: async (id) => {
    try {
      const response = await apiClient.delete(`/priorities/${id}`);
      return response;
    } catch (error) {
      console.error("Error deleting priority:", error);
      throw error;
    }
  },

  updatePriorityLevels: async (items) => {
    try {
      const response = await apiClient.put(`/priorities/levels`, { items });
      return response;
    } catch (error) {
      console.error("Error updating priority levels:", error);
      throw error;
    }
  },
};
export default priorityService;
