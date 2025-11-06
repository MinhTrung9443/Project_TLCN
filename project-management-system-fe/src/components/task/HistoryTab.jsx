import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import moment from 'moment'; // Thư viện xử lý thời gian

// Hàm helper để render thông điệp lịch sử cho đẹp
const formatHistoryMessage = (item) => {
  const user = item.userId.fullname;
  const field = item.fieldName.replace(/Id$/, ''); // Bỏ chữ Id ở cuối

  switch(item.actionType) {
    case 'CREATE':
      return <>{user} created the task <strong>{item.newValue}</strong></>;
    case 'COMMENT':
       return <>{user} added a comment.</>; // Nội dung comment sẽ ở tab comment
    case 'UPDATE':
       return <>{user} updated the <strong>{field}</strong> from "{item.oldValue || 'None'}" to "{item.newValue || 'None'}"</>;
    default:
       return 'An unknown action occurred.';
  }
}

const HistoryTab = ({ taskId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/tasks/${taskId}/history`);
        setHistory(data);
      } catch (error) {
        console.error("Failed to fetch history", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [taskId]);

  if (loading) return <div>Loading history...</div>;

  return (
    <div className="history-list">
      {history.map(item => (
        <div key={item._id} className="history-item">
          <img src={item.userId.avatar} alt={item.userId.fullname} className="avatar" />
          <div className="history-content">
            <p className="history-message">{formatHistoryMessage(item)}</p>
            <span className="history-timestamp">
              {moment(item.createdAt).fromNow()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryTab;