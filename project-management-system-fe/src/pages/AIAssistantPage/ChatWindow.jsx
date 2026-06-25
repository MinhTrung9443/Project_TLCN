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
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">AI Assistant</h2>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
        <div className="flex flex-col gap-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <FaRobot className="text-indigo-600 text-sm" />
                </div>
              )}
              <div
                className={`max-w-[70%] p-3 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
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
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <FaRobot className="text-indigo-600 text-sm" />
                </div>
                <div className="bg-white text-gray-500 border border-gray-200 py-3 px-4 rounded-lg flex items-center gap-2">
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
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi AI bất cứ điều gì..."
            className="flex-1 px-4 py-2 bg-gray-100 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
          >
            <FaPaperPlane />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
