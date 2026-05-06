import React, { useState, useEffect } from 'react';
import { FaPlus, FaCommentDots, FaTrash } from 'react-icons/fa';
import apiClient from '../../services/apiClient';
import { toast } from 'react-toastify';

const ChatHistorySidebar = ({ selectedSessionId, onSessionSelect }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/ai-assistant/sessions');
      setSessions(response.data);
    } catch (error) {
      toast.error('Không thể tải lịch sử trò chuyện.');
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleNewChat = () => {
    onSessionSelect(null);
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) {
      try {
        await apiClient.delete(`/ai-assistant/sessions/${sessionId}`);
        toast.success('Đã xóa cuộc trò chuyện.');
        setSessions(sessions.filter(s => s._id !== sessionId));
        if (selectedSessionId === sessionId) {
          onSessionSelect(null);
        }
      } catch (error) {
        toast.error('Lỗi khi xóa cuộc trò chuyện.');
        console.error('Error deleting session:', error);
      }
    }
  };

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          <FaPlus />
          Trò chuyện mới
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">Đang tải...</div>
        ) : (
          sessions.map(session => (
            <div
              key={session._id}
              onClick={() => onSessionSelect(session._id)}
              className={`flex items-center justify-between p-3 cursor-pointer text-sm ${selectedSessionId === session._id ? 'bg-gray-900' : 'hover:bg-gray-700'}`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FaCommentDots />
                <span className="truncate">{session.title}</span>
              </div>
              <button onClick={(e) => handleDeleteSession(e, session._id)} className="text-gray-400 hover:text-white">
                <FaTrash />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatHistorySidebar;
