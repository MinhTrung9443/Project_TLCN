import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import socketService from "../services/socketService";
import chatService from "../services/chatService";

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();

  // --- UI States ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("PROJECTS"); // PROJECTS | INDIVIDUALS

  // --- Data States ---
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [directChats, setDirectChats] = useState([]);
  const [projectChannels, setProjectChannels] = useState({ general: null, teams: [] });

  const processedMessageIds = useRef(new Set());

  // --- HELPER: Cập nhật danh sách chat (Sidebar) khi có tin mới ---
  const updateChatLists = useCallback((newMessage, currentChatId) => {
    const conversationId = newMessage.conversationId._id || newMessage.conversationId;
    const senderId = newMessage.sender._id || newMessage.sender;

    const isMyMessage = senderId === user?._id;
    const isActiveChat = conversationId === currentChatId;
    const shouldIncrement = !isMyMessage && !isActiveChat;

    setDirectChats((prevChats) => {
      const chatIndex = prevChats.findIndex((c) => c._id === conversationId);
      if (chatIndex > -1) {
        const oldChat = prevChats[chatIndex];
        const updatedChat = {
          ...oldChat,
          lastMessage: newMessage,
          unreadCount: shouldIncrement ? (oldChat.unreadCount || 0) + 1 : (oldChat.unreadCount || 0)
        };
        const otherChats = prevChats.filter((c) => c._id !== conversationId);
        return [updatedChat, ...otherChats];
      }
      return prevChats;
    });

    setProjectChannels((prevChannels) => {
      let isUpdated = false;
      let newChannels = { ...prevChannels };

      if (newChannels.general && newChannels.general._id === conversationId) {
        const oldGeneral = newChannels.general;
        newChannels.general = {
          ...oldGeneral,
          lastMessage: newMessage,
          unreadCount: shouldIncrement ? (oldGeneral.unreadCount || 0) + 1 : (oldGeneral.unreadCount || 0)
        };
        isUpdated = true;
      }
      const teamIndex = newChannels.teams.findIndex((t) => t._id === conversationId);
      if (teamIndex > -1) {
        const oldTeam = newChannels.teams[teamIndex];
        const updatedTeam = {
          ...oldTeam,
          lastMessage: newMessage,
          unreadCount: shouldIncrement ? (oldTeam.unreadCount || 0) + 1 : (oldTeam.unreadCount || 0)
        };
        const otherTeams = newChannels.teams.filter((t) => t._id !== conversationId);
        newChannels.teams = [updatedTeam, ...otherTeams];
        isUpdated = true;
      }

      return isUpdated ? newChannels : prevChannels;
    });
  }, [user]);


  // Find the markAsRead function and replace it with this:
  const markAsRead = (conversationId) => {
    // Clear unread count in Sidebar
    setDirectChats(prev => prev.map(c =>
      c._id === conversationId ? { ...c, unreadCount: 0 } : c
    ));
    setProjectChannels(prev => ({
      ...prev,
      general: prev.general && prev.general._id === conversationId
        ? { ...prev.general, unreadCount: 0 }
        : prev.general,
      teams: prev.teams.map(t =>
        t._id === conversationId ? { ...t, unreadCount: 0 } : t
      )
    }));

    // Only emit if socket is connected and user exists
    if (socketService.socket && user) {
      socketService.socket.emit("mark as read", {
        conversationId,
        userId: user._id
      });

      // Update local UI state immediately so 'Is Read by Me' is true
      if (selectedConversation &&
        (selectedConversation._id === conversationId ||
          selectedConversation._id === conversationId._id)) {

        setMessages((prev) => prev.map(msg => {
          const readers = msg.readBy || [];
          const myId = user._id;

          // Handle populated vs string ID
          const alreadyRead = readers.some(r => (r._id || r) === myId);
          const isMyMessage = (msg.sender._id || msg.sender) === myId;

          if (!alreadyRead && !isMyMessage) {
            return { ...msg, readBy: [...readers, myId] };
          }
          return msg;
        }));
      }
    }
  };
  const sendMessage = async (content, conversationId, attachments) => {
    try {
      // 1. Gọi API lưu xuống DB
      const data = await chatService.sendMessage({
        content,
        conversationId,
        attachments,
      });

      // 2. Emit sự kiện Socket lên Server
      if (socketService.socket) {
        socketService.socket.emit("new message", data);
      }

      // 3. Cập nhật UI ngay lập tức cho người gửi
      setMessages((prev) => [...prev, data]);
      updateChatLists(data, conversationId);

      return data;
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  };

  // --- EFFECT: Lắng nghe tin nhắn đến ---
  useEffect(() => {
    // Chỉ chạy khi user đã login và socket đã connect
    if (!user || !socketService.socket) return;

    const handleMessageReceived = (newMessageReceived) => {
      console.log("📩 Socket received:", newMessageReceived);

      if (processedMessageIds.current.has(newMessageReceived._id)) {
        console.log("⚠️ Duplicate message ignored:", newMessageReceived._id);
        return;
      }

      // Đánh dấu đã xử lý
      processedMessageIds.current.add(newMessageReceived._id);

      // Xóa ID khỏi Set sau 5 giây để giải phóng bộ nhớ (không cần lưu mãi mãi)
      setTimeout(() => {
        if (processedMessageIds.current) {
          processedMessageIds.current.delete(newMessageReceived._id);
        }
      }, 5000);

      const incomingChatId = newMessageReceived.conversationId._id || newMessageReceived.conversationId;

      // Logic: Nếu đang mở đúng đoạn chat đó thì thêm vào list messages
      // Lưu ý: selectedConversation có thể null nếu chưa chọn chat nào
      if (selectedConversation && selectedConversation._id === incomingChatId) {
        setMessages((prevMessages) => {
          // Check trùng lặp (đề phòng mạng lag socket bắn 2 lần)
          if (prevMessages.some(m => m._id === newMessageReceived._id)) {
            return prevMessages;
          }
          return [...prevMessages, newMessageReceived];
        });
      }

      updateChatLists(newMessageReceived, selectedConversation ? selectedConversation._id : null);
    };

    const handleMessageRead = ({ conversationId, readerId }) => {
      // Safe ID extraction helper
      const getSafeId = (id) => {
        if (!id) return "";
        if (typeof id === 'object' && id._id) return id._id.toString();
        return id.toString();
      };

      const currentChatId = getSafeId(selectedConversation);
      const targetChatId = getSafeId(conversationId);
      const readerIdString = getSafeId(readerId);

      console.log(`CLIENT: Signal read from ${readerIdString} for chat ${targetChatId}`);

      if (currentChatId === targetChatId) {
        setMessages((prevMessages) => {
          return prevMessages.map((msg) => {
            // Safe access in case readBy is undefined on a fresh message
            const existingReadBy = Array.isArray(msg.readBy) ? msg.readBy : [];

            // Normalize to check existence
            const isAlreadyRead = existingReadBy.some(r => getSafeId(r) === readerIdString);

            if (!isAlreadyRead) {
              return {
                ...msg,
                readBy: [...existingReadBy, readerId]
              };
            }
            return msg;
          });
        });
      }
    };

    socketService.socket.on("message received", handleMessageReceived);
    socketService.socket.on("message read", handleMessageRead); // <--- Đăng ký

    return () => {
      socketService.socket.off("message received", handleMessageReceived);
      socketService.socket.off("message read", handleMessageRead); // <--- Hủy
    };
  }, [user, selectedConversation, updateChatLists]); // Dependencies

  const loadMessages = async (conversationId) => {
    try {
      // Reset messages để tránh hiện tin cũ của chat trước
      setMessages([]);

      const msgs = await chatService.getMessages(conversationId);
      setMessages(msgs);

      // Emit join chat để server biết user này đang active ở room này
      // (Hỗ trợ tính năng "typing...", "read receipt" sau này)
      if (socketService.socket) {
        socketService.socket.emit("join chat", conversationId);
      }
    } catch (error) {
      console.error("Load messages failed", error);
    }
  };

  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);

  const value = {
    user,
    isChatOpen,
    openChat,
    closeChat,
    activeTab,
    setActiveTab,
    selectedConversation,
    setSelectedConversation,
    messages,
    setMessages,
    sendMessage,
    loadMessages,
    directChats,
    setDirectChats,
    projectChannels,
    setProjectChannels,
    markAsRead,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};