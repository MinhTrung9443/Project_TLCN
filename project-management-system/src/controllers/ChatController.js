const chatService = require("../services/ChatService");

const ChatController = {
  sendMessage: async (req, res) => {
    try {
      const { content, conversationId, attachments } = req.body;
      const message = await chatService.sendMessage(
        req.user.id,
        content,
        conversationId,
        attachments
      );
      res.status(200).json(message);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  allMessages: async (req, res) => {
    try {
      const messages = await chatService.getAllMessages(req.params.conversationId);
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  accessChat: async (req, res) => {
    try {
      const { userId } = req.body;
      const chat = await chatService.accessChat(req.user.id, userId);
      res.status(200).json(chat);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  fetchChats: async (req, res) => {
    try {
      const chats = await chatService.fetchChats(req.user.id);
      res.status(200).json(chats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getProjectChannels: async (req, res) => {
    try {
      const { projectId } = req.params;
      const channels = await chatService.getProjectChannels(req.user.id, projectId);
      res.status(200).json(channels);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};

module.exports = ChatController;