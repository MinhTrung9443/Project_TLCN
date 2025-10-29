import apiClient from "./apiClient";

const priorityService = {
  getAllPriorities: async (projectKey) => {
    try {
      const response = await apiClient.get("/priorities", {
        params: { projectKey },
      });
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

  updatePriorityLevels: async (projectKey, items) => {
    try {
      const response = await apiClient.put(`/priorities/levels/${projectKey}`, { items });
      return response;
    } catch (error) {
      console.error("Error updating priority levels:", error);
      throw error;
    }
  },
  getPriorityList: async () => {
  try {
    // Gọi API lấy tất cả priorities
    const response = await apiClient.get("/priorities/list"); 
    return response;
  } catch (error) {
    console.error("Error fetching all priorities:", error);
    throw error;
  }
}
};
export default priorityService;
