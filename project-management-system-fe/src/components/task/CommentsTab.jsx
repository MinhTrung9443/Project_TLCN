// src/components/task/CommentsTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/apiClient';
import CommentItem from './CommentItem';

const CommentsTab = ({ taskId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // <-- THÊM: State để xử lý lỗi

  const fetchComments = useCallback(async () => {
    // Nếu không có taskId thì không làm gì cả
    if (!taskId) {
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/tasks/${taskId}/comments`);
      setComments(data);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
      setError("Could not load comments. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [taskId]); // Hàm này sẽ được tạo lại chỉ khi taskId thay đổi

  useEffect(() => {
    fetchComments();
  }, [fetchComments]); // Chạy fetchComments khi component mount hoặc khi hàm fetchComments thay đổi

  const handlePostComment = async (e) => {
    e.preventDefault(); // Ngăn trang tải lại khi submit form
    if (newComment.trim() === '') return; // Không gửi comment rỗng

    try {
        const { data: postedComment } = await apiClient.post(`/tasks/${taskId}/comments`, { content: newComment });
        setComments(prevComments => [...prevComments, postedComment]);
        setNewComment(''); // Xóa nội dung trong ô nhập liệu
    } catch (error) {
        console.error("Failed to post comment:", error);
        alert("There was an error posting your comment."); // Thông báo lỗi đơn giản
    }
  };

  const handleCommentUpdated = (updatedComment) => {
    setComments(comments.map(c => c._id === updatedComment._id ? updatedComment : c));
  };
  
  const handleCommentDeleted = (commentId) => {
    setComments(comments.filter(c => c._id !== commentId));
  };

  const renderContent = () => {
    if (loading) {
      return <div>Loading comments...</div>;
    }

    if (error) {
      return <div style={{ color: 'red' }}>{error}</div>;
    }

    if (comments.length === 0) {
      return <div>No comments yet. Be the first to add one!</div>;
    }

    return comments.map(comment => (
      <CommentItem
        key={comment._id}
        comment={comment}
        onCommentUpdated={handleCommentUpdated}
        onCommentDeleted={handleCommentDeleted}
      />
    ));
  }

  return (
    <div className="comments-section">
      <div className="comment-list">
        {renderContent()}
      </div>
      
      <form onSubmit={handlePostComment} className="comment-form">
        <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows="3"
        />
        <button type="submit">Post Comment</button>
      </form>
    </div>
  );
};

export default CommentsTab;