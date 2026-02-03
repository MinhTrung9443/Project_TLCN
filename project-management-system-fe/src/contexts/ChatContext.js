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
      // 1. Check if chat already exists
      const chatIndex = prevChats.findIndex((c) => c._id === conversationId);
      
      if (chatIndex > -1) {
        // Update existing chat
        const oldChat = prevChats[chatIndex];
        const updatedChat = {
          ...oldChat,
          lastMessage: newMessage,
          unreadCount: shouldIncrement ? (oldChat.unreadCount || 0) + 1 : (oldChat.unreadCount || 0)
        };
        const otherChats = prevChats.filter((c) => c._id !== conversationId);
        return [updatedChat, ...otherChats];
      } else {
         // 2. New chat found - we need to add it!
         const convData = typeof newMessage.conversationId === 'object' ? newMessage.conversationId : { _id: conversationId };

         // CRITICAL FIX: Only add to direct chats if type is DIRECT
         if (convData.type && convData.type !== 'DIRECT') {
             return prevChats;
         }
         
         // If we have full conversation data in message, use it
         if (convData.participants) {
             const newChat = {
                 ...convData,
                 lastMessage: newMessage,
                 unreadCount: shouldIncrement ? 1 : 0
             };
             return [newChat, ...prevChats];
         }
         
         // If type is not available but we're here, assume it MIGHT be direct if we don't know otherwise? 
         // Unsafe. Only add if we are sure.
         // But usually backend sends populated.
         
         return prevChats;
      }
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
  const sendMessage = async (content, conversationId, attachments, replyTo = null) => {
    try {
      // 1. Gọi API lưu xuống DB
      const data = await chatService.sendMessage({
        content,
        conversationId,
        attachments,
        replyTo
      });
      // ... (Rest is same)

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

    const handleMessageRecalled = ({ messageId }) => {
         setMessages(prev => prev.map(m => 
              m._id === messageId ? { ...m, isRecalled: true } : m
         ));
    };

    const handleReactionUpdate = ({ messageId, reaction, userId }) => {
         setMessages(prev => prev.map(m => {
              if (m._id !== messageId) return m;

              const existingIdx = m.reactions?.findIndex(r => r.userId === userId || r.userId?._id === userId);
              let newReactions = m.reactions ? [...m.reactions] : [];
              
              // This basic logic mimics backend toggle. 
              // For perfect sync, backend should return 'action' (added/removed/updated) or the full list
              // But here we rely on the same logic:
              // If we receive the same reaction -> User wants to remove? 
              // Actually, since socket comes from another user's action, we assume they did the right toggle.
              // Wait, receiving "type" usually means "set to type". 
              // If the user removed it, we might need a null or separate event.
              // For simplicity: If received same type -> remove. If different -> update.
              // (Ideally backend socket event should be explicit about `added` or `removed`)
             
              if (existingIdx > -1) {
                  const old = newReactions[existingIdx];
                  if (old.type === reaction) {
                      newReactions.splice(existingIdx, 1);
                  } else {
                      newReactions[existingIdx] = { ...old, type: reaction };
                  }
              } else {
                  // We need to know who reacted. We have userId but not username/avatar for display if needed immediately.
                  // But usually reactions just show small icons/counts or tooltip names.
                  // We'll mock the minimal user object
                  newReactions.push({ userId: userId, type: reaction });
              }
              return { ...m, reactions: newReactions };
         }));
    };

     socketService.socket.on("message received", handleMessageReceived);
    socketService.socket.on("message read", handleMessageRead); 
    socketService.socket.on("message recalled", handleMessageRecalled);
    socketService.socket.on("message reaction update", handleReactionUpdate);

    return () => {
        socketService.socket.off("message received", handleMessageReceived);
        socketService.socket.off("message read", handleMessageRead); 
        socketService.socket.off("message recalled", handleMessageRecalled);
        socketService.socket.off("message reaction update", handleReactionUpdate);
    };
  }, [user, selectedConversation, updateChatLists]); // Dependencies

  const recallMessage = async (messageId) => {
      try {
           const msg = await chatService.recallMessage(messageId);
        
           // 2. Emit socket
           if (socketService.socket && selectedConversation) {
               socketService.socket.emit("recall message", {
                   conversationId: selectedConversation._id,
                   messageId
               });
           }

            // 3. Update Local
           setMessages(prev => prev.map(m => 
               m._id === messageId ? { ...m, isRecalled: true } : m
           ));
           
      } catch (error) {
           console.error("Recall error:", error);
           throw error;
      }
  };

  const sendReaction = async (messageId, type) => {
      try {
          // Optimistic update
          setMessages(prev => prev.map(m => {
              if (m._id !== messageId) return m;

              const userId = user._id;
              const existingIdx = m.reactions?.findIndex(r => r.userId === userId || r.userId?._id === userId);
              let newReactions = m.reactions ? [...m.reactions] : [];

              if (existingIdx > -1) {
                  const oldReaction = newReactions[existingIdx];
                  if (oldReaction.type === type) {
                       newReactions.splice(existingIdx, 1);
                  } else {
                       newReactions[existingIdx] = { ...oldReaction, type };
                  }
              } else {
                  newReactions.push({ userId: { _id: userId, username: user.username }, type });
              }
              
              return { ...m, reactions: newReactions };
          }));
          
          await chatService.toggleReaction(messageId, type);

          if (socketService.socket && selectedConversation) {
               socketService.socket.emit("send reaction", {
                   conversationId: selectedConversation._id,
                   messageId,
                   reaction: type,
                   userId: user._id
               });
           }

      } catch (error) {
          console.error("Reaction failed:", error);
          // Revert if error? (Simplest is just let it be or reload)
          loadMessages(selectedConversation._id);
      }
  };

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
    recallMessage,
    sendReaction,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};