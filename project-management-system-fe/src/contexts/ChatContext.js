import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { toast } from "react-toastify";
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
  const activeLoadRef = useRef(null);

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
         const convData = typeof newMessage.conversationId === 'object' ? newMessage.conversationId : { _id: conversationId };

         if (convData.type && convData.type !== 'DIRECT') {
             return prevChats;
         }
         
         if (convData.participants) {
             const newChat = {
                 ...convData,
                 lastMessage: newMessage,
                 unreadCount: shouldIncrement ? 1 : 0
             };
             return [newChat, ...prevChats];
         }

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

      // Check DND and show Notification for messages from others
      const senderId = newMessageReceived.sender._id || newMessageReceived.sender;
      if (senderId !== user._id) {
          const dndStored = localStorage.getItem(`dnd_${user._id}`);
          let isDndActive = false;
          if (dndStored) {
              const dndDate = new Date(dndStored);
              if (new Date() < dndDate) {
                  isDndActive = true;
              } else {
                  localStorage.removeItem(`dnd_${user._id}`);
              }
          }

          if (!isDndActive) {
               // Show toast if chat is not currently open/active
               if (!selectedConversation || selectedConversation._id !== incomingChatId) {
                   const senderName = newMessageReceived.sender.username || "Someone";
                   const shortMsg = newMessageReceived.content || "Sent an attachment";
                   const avatar = newMessageReceived.sender.avatar || "https://via.placeholder.com/40";
                   
                   toast(
                       <div 
                           className="flex items-center gap-3 w-full cursor-pointer"
                           onClick={() => {
                               // Open the chat box if hidden
                               openChat();
                               // Switch to the correct tab based on chat type (DIRECT vs PROJECTS)
                               const chatType = newMessageReceived.conversationId.type;
                               const isDirect = chatType === 'DIRECT' || (!chatType && newMessageReceived.conversationId.participants);
                               setActiveTab(isDirect ? "INDIVIDUALS" : "PROJECTS");
                                 // Let ChatWindow trigger loadMessages automatically
                                 setSelectedConversation({ _id: incomingChatId });
                           }}
                       >
                           <img src={avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm shrink-0" />
                           <div className="flex flex-col flex-1 overflow-hidden">
                               <span className="font-bold text-sm text-gray-800 truncate">{senderName}</span>
                               <span className="text-xs text-gray-500 truncate w-full">{shortMsg}</span>
                           </div>
                       </div>, 
                       {
                           position: "bottom-right",
                           autoClose: 4000,
                           hideProgressBar: true,
                           closeOnClick: true,
                           pauseOnHover: true,
                           draggable: true,
                           className: "rounded-xl shadow-lg border border-gray-100",
                           bodyClassName: "p-0 m-0"
                       }
                   );
               }
               // Play sound
               try {
                   const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                   const oscillator = audioCtx.createOscillator();
                   const gainNode = audioCtx.createGain();
                   
                   oscillator.connect(gainNode);
                   gainNode.connect(audioCtx.destination);
                   
                   // Tone settings for a pleasant "Ding"
                   oscillator.type = 'sine';
                   oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Pitch
                   
                   // Volume fade out
                   gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                   gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                   
                   oscillator.start(audioCtx.currentTime);
                   oscillator.stop(audioCtx.currentTime + 0.3);
               } catch (error) {
                   console.log("Audio play blocked by browser:", error);
               }
          }
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

  const handlePinMessage = async (messageId) => {
    try {
        const updatedConv = await chatService.pinMessage(selectedConversation._id, messageId);
        setSelectedConversation(updatedConv);
        // Có thể emit socket ở đây nếu muốn real-time pin
    } catch (error) {
        console.error("Pin failed:", error);
    }
  };

  const handleUnpinMessage = async (messageId) => {
    try {
        const updatedConv = await chatService.unpinMessage(selectedConversation._id, messageId);
        setSelectedConversation(updatedConv);
    } catch (error) {
        console.error("Unpin failed:", error);
    }
  };

  const handleCreatePoll = async (question, options) => {
    try {
        const data = await chatService.createPoll(selectedConversation._id, question, options);
        if (socketService.socket) {
            socketService.socket.emit("new message", data);
        }
        setMessages((prev) => [...prev, data]);
        updateChatLists(data, selectedConversation._id);
    } catch (error) {
        console.error("Create poll failed:", error);
    }
  };

  const handleVotePoll = async (messageId, optionId) => {
    try {
        const data = await chatService.votePoll(messageId, optionId);
        // Cập nhật local
        setMessages(prev => prev.map(m => m._id === messageId ? data : m));
        // Nên emit socket để update real-time cho poll
    } catch (error) {
        console.error("Vote poll failed:", error);
    }
  };

  const handleSendGiphy = async (giphyUrl) => {
    try {
        // Gửi nội dung rỗng, chỉ đính kèm ảnh động
        await sendMessage("", selectedConversation._id, [
            { url: giphyUrl, type: "image", name: "giphy.gif" }
        ]);
    } catch (error) {
        console.error("Send Giphy failed:", error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const currentId = typeof conversationId === 'object' ? conversationId._id : conversationId;
      activeLoadRef.current = currentId;

      // Reset messages để tránh hiện tin cũ của chat trước
      setMessages([]);

      const convDetails = await chatService.getDetails(currentId);
      
      // Prevent stale response from overwriting newer navigation 
      if (activeLoadRef.current !== currentId) return;

      setSelectedConversation(convDetails);

      const msgs = await chatService.getMessages(currentId);
      
      // Prevent stale response from overwriting newer navigation 
      if (activeLoadRef.current !== currentId) return;

      setMessages(msgs);

      // Emit join chat để server biết user này đang active ở room này
      // (Hỗ trợ tính năng "typing...", "read receipt" sau này)
      if (socketService.socket) {
        socketService.socket.emit("join chat", currentId);
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
    handlePinMessage,
    handleUnpinMessage,
    handleCreatePoll,
    handleVotePoll,
    handleSendGiphy,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};