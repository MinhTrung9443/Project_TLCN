import apiClient from "./apiClient";

const chatService = {
  // Lấy các kênh chat của một Project
  getProjectChannels: async (projectId) => {
    const response = await apiClient.get(`/chats/project/${projectId}`);
    return response.data;
  },

  // Lấy danh sách chat 1-1 (Direct)
  getDirectChats: async () => {
    const response = await apiClient.get("/chats");
    return response.data;
  },

  // Tạo hoặc mở đoạn chat 1-1 với user khác
  accessChat: async (userId) => {
    const response = await apiClient.post("/chats", { userId });
    return response.data;
  },

  // Gửi tin nhắn
  sendMessage: async (data) => {
    // data: { conversationId, content, attachments }
    const response = await apiClient.post("/chats/message", data);
    return response.data;
  },

  // Lấy lịch sử tin nhắn
  getMessages: async (conversationId) => {
    const response = await apiClient.get(`/chats/${conversationId}/messages`);
    return response.data;
  },
};

export default chatService;