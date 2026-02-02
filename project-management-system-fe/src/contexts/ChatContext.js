import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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

  // --- HELPER: Cập nhật danh sách chat (Sidebar) khi có tin mới ---
  const updateChatLists = useCallback((newMessage) => {
    const conversationId = newMessage.conversationId._id || newMessage.conversationId;

    // 1. Cập nhật Direct Chats (Chat 1-1)
    setDirectChats((prevChats) => {
      const chatIndex = prevChats.findIndex((c) => c._id === conversationId);
      if (chatIndex > -1) {
        // Clone chat cũ và cập nhật lastMessage
        const updatedChat = {
          ...prevChats[chatIndex],
          lastMessage: newMessage,
        };
        // Đưa đoạn chat vừa có tin nhắn lên đầu danh sách
        const otherChats = prevChats.filter((c) => c._id !== conversationId);
        return [updatedChat, ...otherChats];
      }
      return prevChats;
    });

    // 2. Cập nhật Project Channels
    setProjectChannels((prevChannels) => {
      let isUpdated = false;
      let newChannels = { ...prevChannels };

      // Check General Channel
      if (newChannels.general && newChannels.general._id === conversationId) {
        newChannels.general = { ...newChannels.general, lastMessage: newMessage };
        isUpdated = true;
      }

      // Check Team Channels
      const teamIndex = newChannels.teams.findIndex((t) => t._id === conversationId);
      if (teamIndex > -1) {
        const updatedTeam = {
          ...newChannels.teams[teamIndex],
          lastMessage: newMessage,
        };
        // Team chat thường không cần sort lại vị trí, chỉ cần update nội dung
        const otherTeams = newChannels.teams.filter((t) => t._id !== conversationId);
        // Nếu muốn đưa team có tin mới lên đầu:
        newChannels.teams = [updatedTeam, ...otherTeams]; 
        // Hoặc giữ nguyên vị trí:
        // newChannels.teams[teamIndex] = updatedTeam; 
        isUpdated = true;
      }

      return isUpdated ? newChannels : prevChannels;
    });
  }, []);

  // --- ACTION: Gửi tin nhắn (Dùng hàm này ở UI Input) ---
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
      updateChatLists(data);

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

      // Luôn cập nhật Sidebar (Direct/Project) để hiện tin nhắn mới nhất
      updateChatLists(newMessageReceived);
    };

    socketService.socket.on("message received", handleMessageReceived);

    // Cleanup
    return () => {
      socketService.socket.off("message received", handleMessageReceived);
    };
  }, [user, selectedConversation, updateChatLists]); 
  // Dependency quan trọng: `selectedConversation` 
  // Để hàm handle biết được mình đang mở chat nào.

  // --- ACTION: Load tin nhắn khi click vào conversation ---
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
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};