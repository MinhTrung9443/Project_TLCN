    import React, { useState, useRef, useEffect } from 'react';
    import { FaRobot, FaTimes, FaPaperPlane, FaExternalLinkAlt } from 'react-icons/fa';
    import apiClient from '../../services/apiClient';
    import ReactMarkdown from 'react-markdown';
    import { Link } from 'react-router-dom';

    const AIAssistantWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Xin chào! Tôi là AI Assistant. Tôi có thể giúp bạn phân tích dự án, quản lý công việc và rủi ro.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const messagesEndRef = useRef(null);

    // Fetch users for mentions on widget load
    useEffect(() => {
        const fetchUsers = async () => {
        try {
            const res = await apiClient.get('/users/get-all-users');
            if (res.data) setUsers(res.data);
        } catch (err) {
            console.error("Error fetching users for AI mentions", err);
        }
        };
        fetchUsers();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInput(val);
        const lastWordMatch = val.match(/@([a-zA-Z0-9_.-]*)$/);
        if (lastWordMatch) {
        setMentionFilter(lastWordMatch[1].toLowerCase());
        setShowMentions(true);
        } else {
        setShowMentions(false);
        }
    };

    // ĐÃ SỬA LỖI Ở ĐÂY: Thêm phần đóng hàm handleSelectMention
    const handleSelectMention = (user) => {
        const newVal = input.replace(/@([a-zA-Z0-9_.-]*)$/, `@${user.email} `);
        setInput(newVal);
        setShowMentions(false);
        setMentionFilter('');
    };

    const filteredUsers = users.filter(u => 
        (u.fullname && u.fullname.toLowerCase().includes(mentionFilter.toLowerCase())) || 
        (u.email && u.email.toLowerCase().includes(mentionFilter.toLowerCase()))
    ).slice(0, 5);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setIsLoading(true);

        try {
        const response = await apiClient.post(
            `/ai-assistant/analyze-risk`, 
            {
            question: userMessage,
              history: messages.map(m => ({ role: m.role, content: m.content })).slice(-6),
            targetProjectName: ""
            }
        );

        const data = response.data?.data;
        const aiResponse = data?.answer || response.data?.answer || response.data?.recommendation || "Xin lỗi, tôi không thể trả lời lúc này.";
        
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        } catch (error) {
        console.error("AI Error:", error);
        const errorMsg = error.response?.data?.message || 'Đã có lỗi xảy ra khi kết nối tới AI. Vui lòng thử lại.';
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
        } finally {
        setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
        {/* Nút bật tắt Chat */}
        {!isOpen && (
            <button 
            onClick={() => setIsOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-xl transition-transform transform hover:scale-105 flex items-center justify-center animate-bounce-slow"
            title="Trợ lý AI"
            >
            <FaRobot className="text-2xl" />
            </button>
        )}

        {/* Cửa sổ Chat */}
        {isOpen && (
            <div className="bg-white rounded-xl shadow-2xl w-[350px] sm:w-[400px] h-[550px] flex flex-col border border-gray-200 overflow-hidden transform transition-all">
            {/* Header */}
            <div className="bg-indigo-600 text-white p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                <FaRobot className="text-xl" />
                <h3 className="font-semibold text-lg">AI Assistant</h3>
                </div>
                <button 
                onClick={() => setIsOpen(false)} 
                className="text-white hover:text-indigo-200 transition-colors p-1"
                >
                <FaTimes className="text-lg" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4">
                {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 shrink-0">
                        <FaRobot className="text-indigo-600 text-sm" />
                    </div>
                    )}
                    <div className={`max-w-[85%] p-3 rounded-2xl text-[15px] ${
                    msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-sm shadow-md' 
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                    }`} style={{ wordBreak: 'break-word' }}>
                    {msg.role === 'assistant' ? (
                        <ReactMarkdown 
                        components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                            li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-indigo-900" {...props} />,
                            a: ({node, ...props}) => {
                                const isInternal = props.href?.startsWith('/');
                                if (isInternal) {
                                return <Link to={props.href} className="text-blue-600 hover:text-blue-800 underline font-medium" {...props}>{props.children}</Link>;
                                }
                                return <a target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-medium flex items-center inline-flex gap-1" {...props}>{props.children} <FaExternalLinkAlt size={10} /></a>;
                            }
                        }}
                        >
                        {msg.content}
                        </ReactMarkdown>
                    ) : (
                        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                    )}
                    </div>
                </div>
                ))}
                
                {/* Hiệu ứng đoạn chat Loading */}
                {isLoading && (
                <div className="flex justify-start items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 shrink-0">
                        <FaRobot className="text-indigo-600 text-sm" />
                    </div>
                    <div className="bg-white text-gray-500 border border-gray-200 py-3 px-4 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area Group */}
            <div className="relative">
                {/* Mention Dropdown */}
                {showMentions && filteredUsers.length > 0 && (
                <div className="absolute bottom-full left-0 w-full bg-white border border-gray-200 rounded-t-lg shadow-[0_-4px_10px_rgba(0,0,0,0.1)] max-h-[250px] overflow-y-auto z-10 text-sm">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                    Chọn thành viên
                    </div>
                    {filteredUsers.map(user => (
                    <div 
                        key={user._id} 
                        className="p-3 hover:bg-indigo-50 border-b border-gray-50 last:border-0 cursor-pointer flex items-center gap-3 transition-colors"
                        onClick={() => handleSelectMention(user)}
                    >
                        {user.avatar ? (
                        <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                        ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-sm">
                            {user.fullname?.[0]?.toUpperCase()}
                        </div>
                        )}
                        <div className="flex flex-col">
                        <span className="font-semibold text-gray-800 text-[14px]">{user.fullname}</span>
                        <span className="text-[12px] text-gray-500">{user.email}</span>
                        </div>
                    </div>
                    ))}
                </div>
                )}
                
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2 items-center shrink-0">
                <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Hỏi AI hoặc gõ @ để gắn thành viên..."
                    className="flex-1 px-4 py-2.5 bg-gray-100 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[15px] transition-all"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors shadow-md flex items-center justify-center"
                >
                    <FaPaperPlane />
                </button>
                </form>
            </div>
            </div>
        )}
        </div>
    );
    };

    export default AIAssistantWidget;