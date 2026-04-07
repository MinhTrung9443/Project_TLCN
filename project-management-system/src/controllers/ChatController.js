const chatService = require("../services/ChatService");
const linkPreview = require('link-preview-js');

const ChatController = {
  sendMessage: async (req, res) => {
    try {
      const { content, conversationId, attachments, replyTo } = req.body;
      const message = await chatService.sendMessage(
        req.user.id,
        content,
        conversationId,
        attachments,
        replyTo 
      );
      res.status(200).json(message);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  recallMessage: async(req, res) => {
      try {
          const { messageId } = req.body;
          const msg = await chatService.recallMessage(messageId, req.user.id);
          res.status(200).json(msg);
      } catch (error) {
          res.status(400).json({ message: error.message });
      }
  },

  toggleReaction: async(req, res) => {
      try {
          const { messageId, type } = req.body;
           const msg = await chatService.toggleReaction(messageId, req.user.id, type);
          res.status(200).json(msg);
      } catch (error) {
           res.status(400).json({ message: error.message });
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

  getDetails: async (req, res) => {
      try {
          const { conversationId } = req.params;
          const details = await chatService.getConversationDetails(conversationId);
          res.status(200).json(details);
      } catch (error) {
          res.status(500).json({ message: error.message });
      }
  },

  search: async (req, res) => {
      try {
          const { conversationId } = req.params;
          const { q } = req.query;
          const msgs = await chatService.searchMessages(conversationId, q);
          res.status(200).json(msgs);
      } catch (error) {
          res.status(500).json({ message: error.message });
      }
  },

  getAttachments: async (req, res) => {
      try {
          const { conversationId } = req.params;
          const { type } = req.query; // 'image', 'raw', or 'all'
          const files = await chatService.getAttachments(conversationId, type);
          res.status(200).json(files);
      } catch (error) {
           res.status(500).json({ message: error.message });
      }
  },

  // --- PIN MESSAGE ---
  pinMessage: async (req, res) => {
    try {
      const { messageId } = req.body;
      const { conversationId } = req.params;
      const conversation = await chatService.pinMessage(conversationId, messageId, req.user.id);
      res.status(200).json(conversation);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  unpinMessage: async (req, res) => {
    try {
      const { messageId } = req.body;
      const { conversationId } = req.params;
      const conversation = await chatService.unpinMessage(conversationId, messageId, req.user.id);
      res.status(200).json(conversation);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // --- POLLS ---
  createPoll: async (req, res) => {
    try {
      const { conversationId, question, options } = req.body;
      const message = await chatService.createPoll(req.user.id, conversationId, question, options);
      res.status(200).json(message);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  votePoll: async (req, res) => {
    try {
      const { messageId, optionId } = req.body;
      const message = await chatService.votePoll(messageId, optionId, req.user.id);
      res.status(200).json(message);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // --- LINK PREVIEW & GIPHY ---
  getLinkPreview: async (req, res) => {
    try {
      const { url } = req.body;
      const data = await linkPreview.getLinkPreview(url);
      res.status(200).json(data);
    } catch (error) {
      res.status(400).json({ message: "Could not generate link preview." });
    }
  },

  sendGiphy: async (req, res) => {
    try {
      const { conversationId, giphyUrl } = req.body;
      const message = await chatService.sendGiphy(req.user.id, conversationId, giphyUrl);
      res.status(200).json(message);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // --- DO NOT DISTURB ---
  setDND: async (req, res) => {
    try {
      const { durationMinutes } = req.body; // e.g., 30, 60, 120, or 0 to turn off
      const user = await chatService.setDND(req.user.id, durationMinutes);
      res.status(200).json({ dndUntil: user.chatSettings.dndUntil });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
};

module.exports = ChatController;