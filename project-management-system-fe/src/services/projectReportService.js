import apiClient from "./apiClient";

const PROJECT_REPORT_TIMEOUT_MS = 0;

const projectReportService = {
  getLatestProjectReportByProjectKey: async (projectKey) => {
    try {
      const response = await apiClient.get(`/reports/project-report/key/${projectKey}/latest`, {
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      console.error("Error loading latest project report by key:", error);
      throw error;
    }
  },

  getLatestProjectReportByProjectId: async (projectId) => {
    try {
      const response = await apiClient.get(`/reports/project-report/id/${projectId}/latest`, {
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      console.error("Error loading latest project report by id:", error);
      throw error;
    }
  },

  generateProjectReportByProjectKey: async (projectKey) => {
    try {
      const response = await apiClient.get(`/reports/project-report/key/${projectKey}`, {
        timeout: PROJECT_REPORT_TIMEOUT_MS,
      });
      return response.data;
    } catch (error) {
      console.error("Error generating project report by key:", error);
      throw error;
    }
  },

  generateProjectReportByProjectId: async (projectId) => {
    try {
      const response = await apiClient.get(`/reports/project-report/id/${projectId}`, {
        timeout: PROJECT_REPORT_TIMEOUT_MS,
      });
      return response.data;
    } catch (error) {
      console.error("Error generating project report by id:", error);
      throw error;
    }
  },

  generateProjectReport: async (payload) => {
    try {
      const response = await apiClient.post("/reports/project-report", payload, {
        timeout: PROJECT_REPORT_TIMEOUT_MS,
      });
      return response.data;
    } catch (error) {
      console.error("Error generating project report:", error);
      throw error;
    }
  },
};

export default projectReportService;
