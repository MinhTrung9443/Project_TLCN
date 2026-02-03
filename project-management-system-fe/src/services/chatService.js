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
  sendMessage: async ({ content, conversationId, attachments, replyTo }) => {
    // data: { conversationId, content, attachments, replyTo }
    const response = await apiClient.post("/chats/message", {
      content,
      conversationId,
      attachments,
      replyTo
    });
    return response.data;
  },

  recallMessage: async(messageId) => {
      const response = await apiClient.post("/chats/recall", { messageId });
      return response.data;
  },

  toggleReaction: async(messageId, type) => {
      const response = await apiClient.post("/chats/reaction", { messageId, type });
      return response.data;
  },

  // Lấy lịch sử tin nhắn
  getMessages: async (conversationId) => {
    const response = await apiClient.get(`/chats/${conversationId}/messages`);
    return response.data;
  },

  getDetails: async (conversationId) => {
     const response = await apiClient.get(`/chats/${conversationId}/details`);
     return response.data;
  },
  
  searchMessages: async (conversationId, query) => {
     const response = await apiClient.get(`/chats/${conversationId}/search?q=${query}`);
     return response.data;
  },

  getAttachments: async (conversationId, type = 'all') => {
     const response = await apiClient.get(`/chats/${conversationId}/attachments?type=${type}`);
     return response.data;
  }
};

export default chatService;