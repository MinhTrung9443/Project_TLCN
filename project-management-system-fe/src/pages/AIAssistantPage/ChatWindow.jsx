import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaRobot } from 'react-icons/fa';
import apiClient from '../../services/apiClient';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';

const AI_REQUEST_TIMEOUT_MS = 60000;

const ChatWindow = ({ sessionId, onSessionChange }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (sessionId) {
        try {
          setIsLoading(true);
          const response = await apiClient.get(`/ai-assistant/sessions/${sessionId}`);
          setMessages(response.data);
        } catch (error) {
          console.error('Error fetching messages:', error);
          setMessages([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setMessages([
          { role: 'assistant', content: 'Xin chào! Tôi là AI Assistant. Hãy bắt đầu một cuộc trò chuyện mới.' }
        ]);
      }
    };
    fetchMessages();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const payload = {
        question: userMessage.content,
        sessionId: sessionId,
        history: messages.slice(-5) 
      };
      
      const response = await apiClient.post('/ai-assistant/analyze-risk', payload, {
        timeout: AI_REQUEST_TIMEOUT_MS,
      });

      const aiResponse = response.data.recommendation || 'Xin lỗi, tôi không thể trả lời lúc này.';
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);

      if (!sessionId && response.data.sessionId) {
        onSessionChange(response.data.sessionId);
      }

    } catch (error) {
      console.error('AI Error:', error);
      const errorMsg = error.code === 'ECONNABORTED'
        ? 'AI mất quá nhiều thời gian để phản hồi. Vui lòng thử lại.'
        : error.response?.data?.message || 'Đã có lỗi xảy ra.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">AI Assistant</h2>
          <p className="text-sm text-slate-500">Tối giản, rõ ràng, dễ theo dõi</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-indigo-600 shadow-sm">
                  <FaRobot className="text-[11px]" />
                </div>
              )}
              <div
                className={`max-w-[72%] rounded-2xl px-3 py-2.5 text-[14px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white rounded-br-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                }`}
              >
                <ReactMarkdown
                  components={{
                    a: ({node, ...props}) => <Link to={props.href} className="text-blue-500 hover:underline" {...props} />
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex items-start gap-3 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-indigo-600 shadow-sm">
                  <FaRobot className="text-[11px]" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-slate-500 shadow-sm">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi AI bất cứ điều gì..."
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
          >
            <FaPaperPlane className="text-[13px]" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
