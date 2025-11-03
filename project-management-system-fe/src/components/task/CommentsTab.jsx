import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import moment from 'moment';

const CommentsTab = ({ taskId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(`/tasks/${taskId}/comments`);
      setComments(data);
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const { data: postedComment } = await apiClient.post(`/tasks/${taskId}/comments`, {
        content: newComment,
      });
      setComments([...comments, postedComment]); // Cập nhật UI ngay lập tức
      setNewComment('');
    } catch (error) {
      console.error("Failed to post comment", error);
    }
  };

  return (
    <div className="comments-section">
      <div className="comment-list">
        {comments.map(comment => (
          <div key={comment._id} className="comment-item">
            <img src={comment.userId.avatar} alt={comment.userId.fullname} className="avatar" />
            <div className="comment-body">
              <div className="comment-header">
                <strong>{comment.userId.fullname}</strong>
                <span>{moment(comment.createdAt).fromNow()}</span>
              </div>
              <p>{comment.content}</p>
              <div className="comment-actions">
                  <button>Reply</button>
                  <button>Edit</button>
                  <button>Delete</button>
                  {/* Nâng cao: thêm reaction ở đây */}
              </div>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handlePostComment} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
        />
        <button type="submit">Save</button>
      </form>
    </div>
  );
};

export default CommentsTab;