import React, { useState, useEffect, useRef, useMemo } from "react";
import { useChat } from "../../contexts/ChatContext";
import { useAuth } from "../../contexts/AuthContext";
import { FaPaperPlane, FaPaperclip, FaArrowLeft, FaCheckDouble } from "react-icons/fa";

const ChatWindow = () => {
    const {
        selectedConversation,
        setSelectedConversation,
        messages,
        loadMessages,
        sendMessage,
        markAsRead,
    } = useChat();

    const { user } = useAuth();
    const [inputMsg, setInputMsg] = useState("");
    const messagesEndRef = useRef(null);
    const [sending, setSending] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (selectedConversation && messages.length > 0) {
            markAsRead(selectedConversation._id);
        }
    }, [selectedConversation, messages.length]); 

    useEffect(() => {
        if (selectedConversation) {
            loadMessages(selectedConversation._id);
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

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputMsg.trim()) return;

        setSending(true);
        try {
            await sendMessage(inputMsg, selectedConversation._id, []);
            setInputMsg("");
        } catch (error) {
            console.error("Failed to send", error);
        } finally {
            setSending(false);
        }
    };

    if (!selectedConversation) return null;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedConversation(null)}
                        className="md:hidden text-gray-500 hover:text-gray-700"
                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h3 className="font-bold text-gray-800">{selectedConversation.name || "Chat"}</h3>
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, index) => {
                    const senderId = getCreateId(msg.sender);
                    const isMe = senderId === user._id;
                    const isLastMessage = index === messages.length - 1;
                    const isLastSeen = msg._id === lastSeenMessageId;

                    return (
                        <div key={msg._id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar và Content giữ nguyên */}
                                {!isMe && (
                                    <img src={msg.sender?.avatar || "https://via.placeholder.com/32"} className="w-8 h-8 rounded-full mx-2 self-end" alt="avatar"/>
                                )}
                                <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                                    isMe ? 'bg-blue-600 text-white' : 'bg-white border text-gray-800'
                                }`}>
                                    <p>{msg.content}</p>
                                </div>
                            </div>
                            
                            {isLastSeen && (
                                <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 mr-1">
                                    <FaCheckDouble className="text-blue-500" /> Seen
                                </div>
                            )}
                            
                            {isMe && isLastMessage && !isLastSeen && (
                                <div className="text-[10px] text-gray-400 mt-1 mr-1">Sent</div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t flex items-center gap-2">
                <button type="button" className="text-gray-400 hover:text-blue-500 p-2">
                    <FaPaperclip />
                </button>
                <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    disabled={sending || !inputMsg.trim()}
                    className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    <FaPaperPlane className="text-sm" />
                </button>
            </form>
        </div>
    );
};

export default ChatWindow;