import apiClient from "./apiClient";

const notificationService = {
  // Get notifications with pagination
  getNotifications: async (page = 1, limit = 20) => {
    try {
      const response = await apiClient.get("/notifications", {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  },

  // Get unread count
  getUnreadCount: async () => {
    try {
      const response = await apiClient.get("/notifications/unread/count");
      return response.data.count;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await apiClient.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  },

  // Mark all as read
  markAllAsRead: async () => {
    try {
      const response = await apiClient.put("/notifications/read-all");
      return response.data;
    } catch (error) {
      console.error("Error marking all as read:", error);
      throw error;
    }
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    try {
      const response = await apiClient.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  },

  // Delete all read notifications
  deleteAllRead: async () => {
    try {
      const response = await apiClient.delete("/notifications/read");
      return response.data;
    } catch (error) {
      console.error("Error deleting read notifications:", error);
      throw error;
    }
  },
};

export default notificationService;
