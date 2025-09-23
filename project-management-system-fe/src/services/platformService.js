import apiClient from "./apiClient";

const platformService = {
  getAllPlatforms: async () => {
    try {
      const response = await apiClient.get("/platforms");
      return response;
    } catch (error) {
      console.error("Error fetching platforms:", error);
      throw error;
    }
  },
  createPlatform: async (data) => {
    try {
      const response = await apiClient.post("/platforms", data);
      return response;
    } catch (error) {
      console.error("Error creating platform:", error);
      throw error;
    }
  },
  updatePlatform: async (id, data) => {
    try {
      const response = await apiClient.put(`/platforms/${id}`, data);
      return response;
    } catch (error) {
      console.error("Error updating platform:", error);
      throw error;
    }
  },
  deletePlatform: async (id) => {
    try {
      const response = await apiClient.delete(`/platforms/${id}`);
      return response;
    } catch (error) {
      console.error("Error deleting platform:", error);
      throw error;
    }
  },
};
export default platformService;
