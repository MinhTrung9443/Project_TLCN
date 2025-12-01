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

  // Get team progress statistics for a project
  getTeamProgress: async (projectId, teamId = null) => {
    try {
      const params = { projectId };
      if (teamId) params.teamId = teamId;

      const response = await apiClient.get("/performance/team-progress", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching team progress:", error);
      throw error;
    }
  },

  // Get member progress statistics
  getMemberProgress: async (projectId, teamId, memberId = null) => {
    try {
      const params = { projectId, teamId };
      if (memberId) params.memberId = memberId;

      const response = await apiClient.get("/performance/member-progress", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching member progress:", error);
      throw error;
    }
  },
};

export default performanceService;
