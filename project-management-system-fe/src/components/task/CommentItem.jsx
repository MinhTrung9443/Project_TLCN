import React, { useState, useMemo } from "react"; // <-- Thêm useMemo vào import
import moment from "moment";
import EmojiPicker from "emoji-picker-react"; // <-- Thêm import cho EmojiPicker
import apiClient from "../../services/apiClient";
import { useAuth } from "../../contexts/AuthContext";
import ConfirmationModal from "../common/ConfirmationModal";

// Cung cấp một avatar mặc định
const DEFAULT_AVATAR = "https://i.pravatar.cc/32";

const CommentItem = ({ comment, onCommentUpdated, onCommentDeleted, activeReplyId, setActiveReplyId }) => {
  // --- SỬA LỖI CÚ PHÁP: Tất cả các Hooks phải được khai báo ở đầu component ---
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [replyContent, setReplyContent] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // --- Logic & Biến được tính toán ---
  const isReplying = activeReplyId === comment._id;
  // Sử dụng optional chaining để code an toàn hơn
  const isOwner = currentUser && comment?.userId?._id === currentUser._id;

  const groupedReactions = useMemo(() => {
    return (comment.reactions || []).reduce((acc, reaction) => {
      const existing = acc.find((item) => item.emoji === reaction.emoji);
      if (existing) {
        existing.count++;
        existing.users.push(reaction.userId);
      } else {
        acc.push({ emoji: reaction.emoji, count: 1, users: [reaction.userId] });
      }
      return acc;
    }, []);
  }, [comment.reactions]);

  const handleUpdate = async () => {
    if (editedContent.trim() === "") return;
    try {
      const { data } = await apiClient.put(`/comments/${comment._id}`, { content: editedContent });
      onCommentUpdated(data); // Báo cho component cha để cập nhật state
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update comment", error);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/comments/${comment._id}`);
      onCommentDeleted(comment._id); // Báo cho cha để xóa khỏi state
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Failed to delete comment", error);
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (replyContent.trim() === "") return;
    try {
      const { data } = await apiClient.post(`/tasks/${comment.taskId}/comments`, {
        content: replyContent,
        parentId: comment._id,
      });
      // Báo cho cha (CommentsTab) biết có comment mới để cập nhật state
      // Đây là cách làm tốt hơn là reload()
      onCommentUpdated(data); // Giả sử onCommentUpdated có thể thêm comment mới
      setReplyContent("");
      setActiveReplyId(null);
    } catch (error) {
      console.error("Failed to post reply", error);
    }
  };
  if (!comment?.userId) {
    return null;
  }
  // --- LOGIC XỬ LÝ REACTION ---
  const handleEmojiClick = async (emojiObject) => {
    try {
      // Optimistic update: Cập nhật UI ngay lập tức
      const existingReactionIndex = comment.reactions.findIndex((r) => r.userId === currentUser._id && r.emoji === emojiObject.emoji);

      let newReactions;
      if (existingReactionIndex > -1) {
        newReactions = comment.reactions.filter((_, index) => index !== existingReactionIndex);
      } else {
        newReactions = [...comment.reactions, { userId: currentUser._id, emoji: emojiObject.emoji }];
      }
      onCommentUpdated({ ...comment, reactions: newReactions });

      setShowEmojiPicker(false);

      // Gọi API
      await apiClient.post(`/comments/${comment._id}/reactions`, { emoji: emojiObject.emoji });
    } catch (error) {
      console.error("Failed to add reaction", error);
      // Nếu lỗi, có thể revert lại state cũ
    }
  };

  return (
    <div className="comment-item-container">
      <div className="comment-item">
        <img src={comment.userId.avatar || DEFAULT_AVATAR} alt={comment.userId.fullname || "Unknown User"} className="avatar" />
        <div className="comment-body">
          <div className="comment-header">
            <strong>{comment.userId.fullname || "Unknown User"}</strong>
            <span>{moment(comment.createdAt).fromNow()}</span>
          </div>

          {/* --- BỔ SUNG LẠI NỘI DUNG COMMENT BỊ THIẾU --- */}
          {isEditing ? (
            <div className="comment-edit-form">
              <textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} />
              <button onClick={handleUpdate}>Save</button>
              <button onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          ) : (
            <p>{comment.content}</p>
          )}

          {/* --- Reactions và Actions đặt ở đây --- */}
          <div className="comment-footer">
            <div className="comment-reactions">
              {groupedReactions.map(({ emoji, count }) => (
                <span key={emoji} className="reaction-chip">
                  {emoji} {count}
                </span>
              ))}
              <button className="add-reaction-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Add reaction">
                +
              </button>
            </div>
            <div className="comment-actions">
              <button onClick={() => setActiveReplyId(isReplying ? null : comment._id)}>{isReplying ? "Cancel" : "Reply"}</button>
              {isOwner && (
                <>
                  <button onClick={() => setIsEditing(true)}>Edit</button>
                  <button onClick={() => setIsDeleteModalOpen(true)}>Delete</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emoji picker nằm ngoài luồng bình thường */}
      {showEmojiPicker && (
        <div className="emoji-picker-container">
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* Form Reply */}
      {isReplying && (
        <form onSubmit={handlePostReply} className="comment-form reply-form">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={`Replying to ${comment.userId.fullname}...`}
            rows="2"
            autoFocus
          />
          <button type="submit">Post Reply</button>
        </form>
      )}

      {/* Render comment con (đệ quy) */}
      {comment.children && comment.children.length > 0 && (
        <div className="comment-replies">
          {comment.children.map((childComment) => (
            <CommentItem
              key={childComment._id}
              comment={childComment}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
            />
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
      />
    </div>
  );
};

export default CommentItem;
