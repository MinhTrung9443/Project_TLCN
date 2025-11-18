import apiClient from "./apiClient";

const performanceService = {
  // Lấy thống kê hiệu suất của user trong project
  getUserPerformance: async (userId, projectId, params = {}) => {
    try {
      const response = await apiClient.get(`/performance/user/${userId}/project/${projectId}`, { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching user performance:", error);
      throw error;
    }
  },

  // Lấy top performers trong project
  getTopPerformers: async (projectId, limit = 10) => {
    try {
      const response = await apiClient.get(`/performance/project/${projectId}/top`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching top performers:", error);
      throw error;
    }
  },

  // Lấy time logs của user trong project
  getUserTimeLogs: async (userId, projectId, params = {}) => {
    try {
      const response = await apiClient.get(`/performance/user/${userId}/project/${projectId}/timelogs`, { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching user time logs:", error);
      throw error;
    }
  },
};

export default performanceService;
