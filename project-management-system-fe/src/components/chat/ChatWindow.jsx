import 'regenerator-runtime/runtime';
import React, { useState, useEffect, useRef, useMemo } from "react";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useChat } from "../../contexts/ChatContext";
import { useAuth } from "../../contexts/AuthContext";
import {
    FaPaperPlane, FaPaperclip, FaArrowLeft, FaCheckDouble,
    FaReply, FaTrash, FaSmile, FaTimes, FaImage, FaInfoCircle,
    FaMicrophone, FaMicrophoneSlash, FaThumbtack, FaPoll, FaRegImages
} from "react-icons/fa";
import apiClient from "../../services/apiClient";
import chatService from "../../services/chatService";
import ChatInfo from "./ChatInfo";

// --- Sub-component: Message Item ---
const MessageItem = ({ msg, user, participants, onReply, onRecall, onReact, onPin, onUnpin, isPinned, onVotePoll, isLastSeen, isLastMessage }) => {
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
                            (msg.replyTo.content ? ` "${msg.replyTo.content.substring(0, 20)}${msg.replyTo.content.length > 20 ? '...' : ''}"` : " [Attachment]")
                        }
                    </span>
                </div>
            )}

            <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[80%]`}>
                {!isMe && (
                    <img src={msg.sender?.avatar || "https://via.placeholder.com/32"}
                        className="w-8 h-8 rounded-full mx-2 mb-1" alt="avatar" />
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

                    {(msg.content || msg.type === 'poll') && (
                        <div
                            className={`px-4 py-2 rounded-2xl text-sm relative ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border text-gray-800 rounded-bl-none shadow-sm'
                                }`}
                        >
                            {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                            {/* LINK PREVIEW */}
                            {msg.linkPreview && (
                                <div className="mt-2 text-left border rounded overflow-hidden bg-gray-50 text-gray-800">
                                    {msg.linkPreview.image && <img src={msg.linkPreview.image} alt="preview" className="w-full h-32 object-cover" />}
                                    <div className="p-2">
                                        <div className="text-xs text-blue-600 font-semibold truncate">{msg.linkPreview.siteName || 'Link'}</div>
                                        <a href={msg.linkPreview.url} target="_blank" rel="noreferrer" className="text-sm font-bold block truncate hover:underline">
                                            {msg.linkPreview.title}
                                        </a>
                                        <div className="text-xs text-gray-500 line-clamp-2">{msg.linkPreview.description}</div>
                                    </div>
                                </div>
                            )}

                            {/* POLL */}
                            {msg.type === 'poll' && msg.poll && (
                                <div className="mt-2 p-3 bg-white border rounded-lg text-gray-800 shadow-sm min-w-[200px]">
                                    <div className="font-bold flex items-center gap-2 mb-2">
                                        <FaPoll className="text-blue-500" /> {msg.poll.question}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        {msg.poll.options.map(opt => {
                                            const hasVoted = opt.voters.includes(user._id);
                                            const totalVotes = msg.poll.options.reduce((sum, o) => sum + o.voters.length, 0);
                                            const percent = totalVotes === 0 ? 0 : Math.round((opt.voters.length / totalVotes) * 100);
                                            
                                            // Get voter names
                                            const voterNames = opt.voters.map(vId => {
                                                const p = participants.find(p => p._id === vId || p === vId);
                                                if (vId === user._id) return "You";
                                                return p ? (p.username || p.fullname) : "Unknown";
                                            }).join(", ");

                                            return (
                                                <div key={opt._id} className="relative group">
                                                    <button
                                                        onClick={() => onVotePoll(msg._id, opt._id)}
                                                        className={`w-full relative overflow-hidden text-left p-2 border rounded text-xs transition-colors hover:bg-blue-50 ${hasVoted ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
                                                    >
                                                        <div className="absolute top-0 left-0 h-full bg-blue-100 transition-all" style={{ width: `${percent}%`, zIndex: 0 }}></div>
                                                        <div className="relative z-10 flex justify-between">
                                                            <span>{opt.text}</span>
                                                            <span className="text-gray-500 font-medium">{opt.voters.length > 0 && `${opt.voters.length} (${percent}%)`}</span>
                                                        </div>
                                                    </button>
                                                    {opt.voters.length > 0 && (
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-max max-w-[200px] z-50 bg-black text-white text-[10px] px-2 py-1 rounded shadow-lg">
                                                            {voterNames}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-2 text-right">
                                        {msg.poll.options.reduce((sum, o) => sum + o.voters.length, 0)} votes
                                    </div>
                                </div>
                            )}

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
                        <FaReply size={14} />
                    </button>
                    <button onClick={() => isPinned ? onUnpin(msg._id) : onPin(msg._id)} className={`text-gray-300 hover:text-blue-500 p-1 transition-colors ${isPinned ? 'text-blue-500' : ''}`} title={isPinned ? "Unpin" : "Pin"}>
                        <FaThumbtack size={14} />
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
                            <FaTrash size={14} />
                        </button>
                    )}
                </div>
            </div>

            <div className={`flex items-center gap-1 mt-1 text-[10px] text-gray-400 ${isMe ? 'mr-1' : 'ml-12'}`}>
                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
        handlePinMessage,
        handleUnpinMessage,
        handleCreatePoll,
        handleVotePoll,
        handleSendGiphy
    } = useChat();

    // 2. LẤY USER TỪ AUTH CONTEXT (NGUỒN CHÍNH)
    const { user } = useAuth();

    // 3. SPEECH RECOGNITION HOOKS
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();


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
    const textareaRef = useRef(null); // Ref for textarea
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showPollForm, setShowPollForm] = useState(false);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState(["", ""]);

    // Lưu trữ text trước khi bật mic để append thêm thay vì ghi đè
    const prevInputRef = useRef("");

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            // 128px is the max-h-32 from tailwind (32 * 4px)
            textareaRef.current.style.height = `${Math.min(scrollHeight, 128)}px`;
        }
    }, [inputMsg]);

    // Khi bắt đầu bật mic, ghi nhận lại những gì user đã gõ trước đó
    useEffect(() => {
        if (listening) {
            prevInputRef.current = inputMsg.trim() ? inputMsg.trim() + " " : "";
        }
    }, [listening]);

    // Update field khi giọng nói thay đổi (cộng dồn với chữ cũ)
    useEffect(() => {
        if (listening) {
            setInputMsg(prevInputRef.current + transcript);
        }
    }, [transcript, listening]);

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
    }, [selectedConversation?._id, messages.length]);

    useEffect(() => {
        if (selectedConversation) {
            loadMessages(selectedConversation._id);
            setReplyTo(null);
            setAttachments([]);
            setShowInfo(false);
            setInputMsg("");
        }
    }, [selectedConversation?._id]);

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
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async (e) => {
        e.preventDefault();

        if (showPollForm) {
            const validOptions = pollOptions.filter(o => o.trim() !== "");
            if (!pollQuestion.trim() || validOptions.length < 2) {
                alert("Poll needs a question and at least 2 valid options.");
                return;
            }
            setSending(true);
            try {
                await handleCreatePoll(pollQuestion, validOptions);
                setShowPollForm(false);
                setPollQuestion("");
                setPollOptions(["", ""]);
            } catch (error) {
                console.error(error);
            } finally {
                setSending(false);
            }
            return;
        }

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
            resetTranscript(); // Clear transcript after sending
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

                {/* Pinned Messages Area */}
                {selectedConversation?.pinnedMessages?.length > 0 && (
                    <div className="bg-blue-50 border-b p-2 flex flex-col gap-1 z-10">
                        {selectedConversation.pinnedMessages.map((pinnedId) => {
                            const pinnedObj = typeof pinnedId === 'object' ? pinnedId : messages.find(m => m._id === pinnedId);
                            if (!pinnedObj) return null;
                            return (
                                <div key={pinnedObj._id} className="flex items-center justify-between text-xs cursor-pointer hover:bg-blue-100 p-1 rounded" onClick={() => handleJumpToMessage(pinnedObj._id)}>
                                    <div className="flex items-center gap-2 truncate">
                                        <FaThumbtack className="text-blue-500 shrink-0" />
                                        <span className="font-semibold">{pinnedObj.sender?.username || 'User'}:</span>
                                        <span className="truncate text-gray-700">{pinnedObj.content || '[Attachment/Poll]'}</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleUnpinMessage(pinnedObj._id); }} className="text-gray-400 hover:text-red-500">
                                        <FaTimes />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col">
                    {messages.map((msg, index) => (
                        <MessageItem
                            key={msg._id || index}
                            msg={msg}
                            user={user}
                            participants={[...(selectedConversation?.participants || []), ...(selectedConversation?.members || [])]}
                            onReply={setReplyTo}
                            onRecall={recallMessage}
                            onReact={sendReaction}
                            onPin={handlePinMessage}
                            onUnpin={handleUnpinMessage}
                            isPinned={selectedConversation?.pinnedMessages?.some(p => (p._id || p) === msg._id)}
                            onVotePoll={handleVotePoll}
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
                                    <img src={att.url} className="w-full h-full object-cover" alt="prev" />
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

                {/* Poll Form Preview */}
                {showPollForm && (
                    <div className="p-4 bg-blue-50 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-sm text-blue-800">Create Poll</h4>
                            <button onClick={() => setShowPollForm(false)} className="text-gray-400 hover:text-red-500"><FaTimes /></button>
                        </div>
                        <input
                            type="text"
                            placeholder="Ask a question..."
                            className="w-full p-2 mb-2 text-sm border rounded outline-none focus:border-blue-400"
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            autoFocus
                        />
                        {pollOptions.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2 mb-1">
                                <input
                                    type="text"
                                    placeholder={`Option ${idx + 1}`}
                                    className="flex-1 p-1.5 text-sm border rounded outline-none focus:border-blue-400"
                                    value={opt}
                                    onChange={(e) => {
                                        const newOpts = [...pollOptions];
                                        newOpts[idx] = e.target.value;
                                        setPollOptions(newOpts);
                                    }}
                                />
                                <button
                                    className="text-red-400 hover:text-red-600"
                                    onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                    disabled={pollOptions.length <= 2}
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        ))}
                        <button
                            className="text-blue-600 text-xs font-bold mt-1 hover:underline"
                            onClick={() => setPollOptions([...pollOptions, ""])}
                        >
                            + Add Option
                        </button>
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
                        <FaImage size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowPollForm(!showPollForm)}
                        className="text-gray-400 hover:text-blue-500 p-2 mb-1"
                        title="Create Poll"
                    >
                        <FaPoll size={20} />
                    </button>

                    {browserSupportsSpeechRecognition && (
                        <button
                            type="button"
                            onClick={() => {
                                if (listening) {
                                    SpeechRecognition.stopListening();
                                    // Optional: Muốn xóa luông nếu stop thì: resetTranscript();
                                } else {
                                    resetTranscript(); // Reset mới hoàn toàn Băng ghi trước khi thu lại
                                    SpeechRecognition.startListening({ continuous: true, language: 'vi-VN' });
                                }
                            }}
                            className={`p-2 mb-1 transition-colors ${listening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-blue-500'}`}
                            title={listening ? "Stop recording" : "Start recording"}
                        >
                            {listening ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
                        </button>
                    )}

                    <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 flex items-center">
                        <textarea
                            ref={textareaRef}
                            value={inputMsg}
                            onChange={(e) => setInputMsg(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                            placeholder="Type a message..."
                            className="w-full bg-transparent text-sm focus:outline-none resize-none custom-scrollbar"
                            rows={1}
                            style={{ maxHeight: '128px' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={sending || uploading || (!showPollForm && !inputMsg.trim() && attachments.length === 0)}
                        className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors mb-0.5"
                    >
                        {sending ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <FaPaperPlane className="text-sm" />}
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