import React, { useState } from 'react';
import moment from 'moment';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext'; 

const CommentItem = ({ comment, onCommentUpdated, onCommentDeleted }) => {
    const { user: currentUser } = useAuth(); 
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);

    const isOwner = currentUser && comment.userId._id === currentUser._id;

    const handleUpdate = async () => {
        if (editedContent.trim() === '') return;
        try {
            const { data } = await apiClient.put(`/comments/${comment._id}`, { content: editedContent });
            onCommentUpdated(data); // Báo cho component cha để cập nhật state
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update comment", error);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this comment?")) {
            try {
                await apiClient.delete(`/comments/${comment._id}`);
                onCommentDeleted(comment._id); // Báo cho cha để xóa khỏi state
            } catch (error) {
                console.error("Failed to delete comment", error);
            }
        }
    };

    return (
        <div className="comment-item">
            <img src={comment.userId.avatar} alt={comment.userId.fullname} className="avatar" />
            <div className="comment-body">
                <div className="comment-header">
                    <strong>{comment.userId.fullname}</strong>
                    <span>{moment(comment.createdAt).fromNow()}</span>
                </div>

                {isEditing ? (
                    <div className="comment-edit-form">
                        <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                        />
                        <button onClick={handleUpdate}>Save</button>
                        <button onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                ) : (
                    <p>{comment.content}</p>
                )}

                <div className="comment-actions">
                    <button>Reply</button> {/* Sẽ làm sau */}
                    {isOwner && (
                        <>
                            <button onClick={() => setIsEditing(true)}>Edit</button>
                            <button onClick={handleDelete}>Delete</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommentItem;