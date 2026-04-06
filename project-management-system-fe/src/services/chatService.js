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
  },

  // --- PIN MESSAGE ---
  pinMessage: async (conversationId, messageId) => {
    const response = await apiClient.post(`/chats/${conversationId}/pin`, { messageId });
    return response.data;
  },

  unpinMessage: async (conversationId, messageId) => {
    const response = await apiClient.post(`/chats/${conversationId}/unpin`, { messageId });
    return response.data;
  },

  // --- POLLS ---
  createPoll: async (conversationId, question, options) => {
    const response = await apiClient.post('/chats/poll', { conversationId, question, options });
    return response.data;
  },

  votePoll: async (messageId, optionId) => {
    const response = await apiClient.post('/chats/poll/vote', { messageId, optionId });
    return response.data;
  },

  // --- LINK PREVIEW & GIPHY ---
  getLinkPreview: async (url) => {
    const response = await apiClient.post('/chats/link-preview', { url });
    return response.data;
  },

  sendGiphy: async (conversationId, giphyUrl) => {
    const response = await apiClient.post('/chats/giphy', { conversationId, giphyUrl });
    return response.data;
  },

  // --- DO NOT DISTURB ---
  setDND: async (durationMinutes) => {
    const response = await apiClient.post('/chats/user/dnd', { durationMinutes });
    return response.data;
  }
};

export default chatService;