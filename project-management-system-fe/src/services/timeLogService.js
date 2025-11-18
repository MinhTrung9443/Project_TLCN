import apiClient from "./apiClient";

const timeLogService = {
  // Tạo time log mới
  createTimeLog: async (taskId, timeSpent, comment) => {
    try {
      const response = await apiClient.post("/timelogs", {
        taskId,
        timeSpent,
        comment,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Lấy time logs của task
  getTimeLogsByTask: async (taskId) => {
    try {
      const response = await apiClient.get(`/timelogs/task/${taskId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Cập nhật time log
  updateTimeLog: async (timeLogId, updateData) => {
    try {
      const response = await apiClient.put(`/timelogs/${timeLogId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Xóa time log
  deleteTimeLog: async (timeLogId) => {
    try {
      const response = await apiClient.delete(`/timelogs/${timeLogId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Lấy thống kê
  getTimeLogStats: async (startDate, endDate) => {
    try {
      const response = await apiClient.get("/timelogs/stats", {
        params: { startDate, endDate },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default timeLogService;
