import React, { useState, useEffect, useRef } from "react";
import { useChat } from "../../contexts/ChatContext";
import { useAuth } from "../../contexts/AuthContext";
import { FaPaperPlane, FaPaperclip, FaArrowLeft } from "react-icons/fa";

const ChatWindow = () => {
    const { 
        selectedConversation, 
        setSelectedConversation, 
        messages, 
        loadMessages,
        sendMessage 
    } = useChat();
    
    const { user } = useAuth();
    const [inputMsg, setInputMsg] = useState("");
    const messagesEndRef = useRef(null);
    const [sending, setSending] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (selectedConversation) {
            loadMessages(selectedConversation._id);
        }
    }, [selectedConversation]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
                        {/* Logic hiển thị online có thể cập nhật sau */}
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
                {messages.map((msg, index) => {
                    // Check null safe cho sender
                    const senderId = msg.sender?._id || msg.sender; 
                    const isMe = senderId === user._id;
                    const avatar = msg.sender?.avatar || "https://via.placeholder.com/32";

                    return (
                        <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {!isMe && (
                                <img 
                                    src={avatar} 
                                    alt="avatar" 
                                    className="w-8 h-8 rounded-full mr-2 self-end"
                                />
                            )}
                            <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                                isMe 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-white border text-gray-800 rounded-bl-none shadow-sm'
                            }`}>
                                <p>{msg.content}</p>
                            </div>
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