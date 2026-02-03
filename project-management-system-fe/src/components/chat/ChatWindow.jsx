import React, { useState, useEffect, useRef, useMemo } from "react";
import { useChat } from "../../contexts/ChatContext";
import { useAuth } from "../../contexts/AuthContext";
import { 
    FaPaperPlane, FaPaperclip, FaArrowLeft, FaCheckDouble, 
    FaReply, FaTrash, FaSmile, FaTimes, FaImage, FaInfoCircle
} from "react-icons/fa";
import apiClient from "../../services/apiClient";
import chatService from "../../services/chatService";
import ChatInfo from "./ChatInfo";

// --- Sub-component: Message Item ---
const MessageItem = ({ msg, user, onReply, onRecall, onReact, isLastSeen, isLastMessage }) => {
    const isMe = (msg.sender?._id || msg.sender) === user._id;
    const [showActions, setShowActions] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    
    const isRecallable = useMemo(() => {
        if (!isMe || msg.isRecalled) return false;
        const diff = new Date() - new Date(msg.createdAt);
        return diff < 5 * 60 * 1000;
    }, [msg, isMe]);

    if (msg.isRecalled) {
        return (
            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1`}>
                <div className="px-4 py-2 border rounded-2xl bg-gray-100 text-gray-500 italic text-sm">
                    Message unsent
                </div>
            </div>
        );
    }

    return (
        <div 
            id={`msg-${msg._id}`}
            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative my-1`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
        >
            {msg.replyTo && (
                <div className={`text-xs text-gray-400 mb-1 flex items-center gap-1 ${isMe ? 'mr-2' : 'ml-10'}`}>
                    <FaReply /> 
                    <span>
                        Replying to <strong>{msg.replyTo.sender?.username || "Someone"}</strong>: 
                        {msg.replyTo.isRecalled ? " (Message unsent)" : 
                            (msg.replyTo.content ? ` "${msg.replyTo.content.substring(0, 20)}${msg.replyTo.content.length>20?'...':''}"` : " [Attachment]")
                        }
                    </span>
                </div>
            )}

            <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[80%]`}>
                {!isMe && (
                    <img src={msg.sender?.avatar || "https://via.placeholder.com/32"} 
                         className="w-8 h-8 rounded-full mx-2 mb-1" alt="avatar"/>
                )}

                <div className="flex flex-col gap-1">
                    {msg.attachments?.map((att, idx) => (
                        <div key={idx} className="rounded-lg overflow-hidden border">
                            {att.type === 'image' || (att.url && att.url.match(/\.(jpeg|jpg|gif|png)$/) != null) ? (
                                <img src={att.url} alt="att" className="max-w-[200px] max-h-[200px] object-cover" />
                            ) : (
                                <a href={att.url} target="_blank" rel="noreferrer" className="block p-2 bg-gray-50 text-blue-600 underline text-xs">
                                    {att.name || "Attachment"}
                                </a>
                            )}
                        </div>
                    ))}

                    {msg.content && (
                        <div 
                            className={`px-4 py-2 rounded-2xl text-sm relative ${
                                isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border text-gray-800 rounded-bl-none shadow-sm'
                            }`}
                        >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            {msg.reactions && msg.reactions.length > 0 && (
                                <div className="absolute -bottom-3 right-0 bg-white border rounded-full px-1.5 py-0.5 shadow-sm text-[10px] flex items-center gap-0.5 z-10">
                                    {msg.reactions.slice(0, 3).map((r, i) => (
                                        <span key={i}>{r.type}</span>
                                    ))}
                                    {msg.reactions.length > 3 && <span>+{msg.reactions.length - 3}</span>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={`flex items-center gap-2 mx-2 transition-opacity ${isMe ? 'flex-row-reverse' : ''}`}>
                    <button onClick={() => onReply(msg)} className="text-gray-300 hover:text-blue-500 p-1 transition-colors" title="Reply">
                        <FaReply size={14}/>
                    </button>
                    {!isMe && (
                         <div className="relative">
                             <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-1 transition-colors ${showEmojiPicker ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}>
                                 <FaSmile size={14} />
                             </button>
                             {showEmojiPicker && (
                                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white shadow-xl border rounded-full p-1.5 gap-1 z-50 flex w-max">
                                     {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
                                         <button key={emoji} onClick={() => { onReact(msg._id, emoji); setShowEmojiPicker(false); }} className="hover:scale-125 hover:bg-gray-100 rounded-full transition-transform text-xl px-1.5 py-0.5">
                                             {emoji}
                                         </button>
                                     ))}
                                 </div>
                             )}
                         </div>
                    )}
                    {isRecallable && (
                        <button onClick={() => onRecall(msg._id)} className="text-gray-300 hover:text-red-500 p-1 transition-colors" title="Unsend">
                            <FaTrash size={14}/>
                        </button>
                    )}
                </div>
            </div>
            
            <div className={`flex items-center gap-1 mt-1 text-[10px] text-gray-400 ${isMe ? 'mr-1' : 'ml-12'}`}>
               <span>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
               {isLastSeen && (
                  <span className="flex items-center gap-0.5 text-blue-500 font-bold ml-1">
                      <FaCheckDouble /> Seen
                  </span>
               )}
               {isMe && isLastMessage && !isLastSeen && (
                   <span className="ml-1">Sent</span>
               )}
            </div>
        </div>
    );
};

// --- Main Component ---
const ChatWindow = () => {
    // 1. LẤY DATA TỪ CONTEXT (BỎ 'user' Ở ĐÂY ĐỂ TRÁNH TRÙNG LẶP)
    const {
        selectedConversation,
        setSelectedConversation,
        messages,
        loadMessages,
        sendMessage,
        markAsRead,
        recallMessage,
        sendReaction,
        setActiveTab,
        setDirectChats, 
    } = useChat();

    // 2. LẤY USER TỪ AUTH CONTEXT (NGUỒN CHÍNH)
    const { user } = useAuth();

    // Helper: Tính toán tên hiển thị cho cuộc trò chuyện
    const getChatName = (chat) => {
        if (!chat) return "Chat";
        if (chat.isGroupChat || chat.type !== "DIRECT") {
            return chat.name;
        }
        // Với chat 1-1, tìm thành viên "không phải tôi"
        const otherMember = chat.participants?.find(p => {
             const pId = typeof p === 'string' ? p : p._id;
             return pId !== user._id;
        });
        
        if (otherMember) {
            return otherMember.username || otherMember.fullname || "User";
        }
        return "Member";
    };

    const [inputMsg, setInputMsg] = useState("");
    const [attachments, setAttachments] = useState([]); 
    const [replyTo, setReplyTo] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleJumpToMessage = (messageId) => {
        setShowInfo(false); 
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.backgroundColor = '#e0f2fe'; 
            setTimeout(() => { el.style.backgroundColor = ''; }, 2000);
        }
    };

    const handleChatWithUser = async (userId) => {
        try {
            setShowInfo(false);
            const chat = await chatService.accessChat(userId);
            setActiveTab("INDIVIDUALS");

            setDirectChats(prev => {
                const exists = prev.find(c => c._id === chat._id);
                if (exists) return prev;
                return [chat, ...prev];
            });

            setTimeout(() => {
                setSelectedConversation(chat);
            }, 50);

        } catch (error) {
            console.error("Failed to access chat:", error);
            alert("Could not start chat with this user.");
        }
    };

    useEffect(() => {
        if (selectedConversation && messages.length > 0) {
            markAsRead(selectedConversation._id);
        }
    }, [selectedConversation, messages.length]); 

    useEffect(() => {
        if (selectedConversation) {
            loadMessages(selectedConversation._id);
            setReplyTo(null);
            setAttachments([]);
            setShowInfo(false);
            setInputMsg("");
        }
    }, [selectedConversation]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getCreateId = (data) => (typeof data === 'object' && data !== null ? data._id : data);

    const lastSeenMessageId = useMemo(() => {
        const reversed = [...messages].reverse();
        const found = reversed.find(msg => {
            const senderId = getCreateId(msg.sender);
            const isMe = senderId === user._id;

            const readers = msg.readBy || [];
            const seenByOthers = readers.some(reader => {
                const readerId = getCreateId(reader);
                return readerId !== user._id;
            });
            return isMe && seenByOthers;
        });
        return found ? found._id : null;
    }, [messages, user]);

    // Handle File Upload
    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        try {
            const uploaded = await Promise.all(files.map(async file => {
                 const formData = new FormData();
                 formData.append('file', file);
                 
                 const res = await apiClient.post('/uploads', formData, {
                     headers: { 'Content-Type': 'multipart/form-data' }
                 });
                 
                 return {
                     url: res.data.imageUrl || res.data.url, 
                     type: file.type.startsWith('image/') ? 'image' : 'raw',
                     name: file.name
                 };
            }));
            setAttachments(prev => [...prev, ...uploaded]);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed!");
        } finally {
            setUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if ((!inputMsg.trim() && attachments.length === 0) || uploading) return;

        setSending(true);
        try {
            await sendMessage(inputMsg, selectedConversation._id, attachments, replyTo?._id);
            setInputMsg("");
            setAttachments([]);
            setReplyTo(null);
        } catch (error) {
            console.error("Failed to send", error);
        } finally {
            setSending(false); // SỬA LỖI SYNTAX Ở ĐÂY
        }
    };

    if (!selectedConversation) return null;

    return (
        <div className="flex flex-row h-full bg-white overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedConversation(null)}
                            className="md:hidden text-gray-500 hover:text-gray-700"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            {/* DÙNG HÀM getChatName ĐỂ HIỂN THỊ TÊN ĐÚNG */}
                            <h3 className="font-bold text-gray-800">{getChatName(selectedConversation)}</h3>
                            <p className="text-xs text-green-500 flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowInfo(!showInfo)} 
                        className={`p-2 rounded-full hover:bg-gray-100 ${showInfo ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
                    >
                        <FaInfoCircle size={20} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col">
                    {messages.map((msg, index) => (
                        <MessageItem 
                            key={msg._id || index}
                            msg={msg} 
                            user={user}
                            onReply={setReplyTo}
                            onRecall={recallMessage}
                            onReact={sendReaction}
                            isLastSeen={msg._id === lastSeenMessageId && !msg.isRecalled}
                            isLastMessage={index === messages.length - 1}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Reply Preview */}
                {replyTo && (
                    <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
                        <div className="flex flex-col border-l-2 border-blue-500 pl-2">
                            <span className="font-bold text-blue-600">Replying to {replyTo.sender?.username}</span>
                            <span className="truncate max-w-[300px]">{replyTo.content || "[Attachment]"}</span>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-red-500">
                            <FaTimes />
                        </button>
                    </div>
                )}

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex gap-2 overflow-x-auto">
                        {attachments.map((att, idx) => (
                            <div key={idx} className="relative group w-16 h-16 shrink-0 border rounded overflow-hidden">
                                {att.type === 'image' ? (
                                    <img src={att.url} className="w-full h-full object-cover" alt="prev"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-xs text-center p-1 break-words">
                                        {att.name}
                                    </div>
                                )}
                                <button 
                                    onClick={() => handleRemoveAttachment(idx)}
                                    className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <FaTimes size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Input Form */}
                <form onSubmit={handleSend} className="p-3 bg-white border-t flex items-end gap-2 shrink-0">
                    <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.doc,.docx"
                    />
                    <button 
                        type="button" 
                        onClick={() => fileInputRef.current.click()}
                        className="text-gray-400 hover:text-blue-500 p-2 mb-1"
                    >
                        <FaImage size={20}/>
                    </button>
                    
                    <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2">
                        <textarea
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                            placeholder="Type a message..."
                            className="w-full bg-transparent text-sm focus:outline-none resize-none max-h-32 custom-scrollbar"
                            rows={1}
                            style={{minHeight: '24px'}}
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={sending || uploading || (!inputMsg.trim() && attachments.length === 0)}
                        className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors mb-0.5"
                    >
                        {sending ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"/> : <FaPaperPlane className="text-sm" />}
                    </button>
                </form>
            </div>

            {/* Info Sidebar */}
            {showInfo && (
                <div className="w-80 border-l bg-white flex flex-col h-full">
                     <ChatInfo 
                        conversation={selectedConversation} 
                        onClose={() => setShowInfo(false)} 
                        onJumpToMessage={handleJumpToMessage}
                        onChatWithUser={handleChatWithUser}
                    />
                </div>
            )}
        </div>
    );
};

export default ChatWindow;