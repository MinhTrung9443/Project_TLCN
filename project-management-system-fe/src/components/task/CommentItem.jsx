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

  // Helper function to check if file is an image
  const isImage = (filename) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"];
    return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
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
    <div className="space-y-4">
      <div className="flex gap-3 p-4 bg-white rounded-lg border border-neutral-200">
        <img
          src={comment.userId.avatar || DEFAULT_AVATAR}
          alt={comment.userId.fullname || "Unknown User"}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <strong className="text-neutral-900">{comment.userId.fullname || "Unknown User"}</strong>
            <span className="text-xs text-neutral-500">{moment(comment.createdAt).fromNow()}</span>
          </div>

          {/* --- BỔ SUNG LẠI NỘI DUNG COMMENT BỊ THIẾU --- */}
          {isEditing ? (
            <div className="space-y-3 mb-3 p-3 bg-neutral-50 rounded-lg">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-3 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p>{comment.content}</p>

              {/* Display attachments */}
              {comment.attachments && comment.attachments.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3 mb-3">
                  {comment.attachments.map((attachment, index) => (
                    <div key={index} className="flex-shrink-0">
                      {isImage(attachment.filename) ? (
                        <div className="flex flex-col gap-1">
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="inline-block">
                            <img
                              src={attachment.url}
                              alt={attachment.filename}
                              style={{
                                maxWidth: "150px",
                                maxHeight: "150px",
                                borderRadius: "8px",
                                objectFit: "contain",
                                display: "block",
                              }}
                            />
                          </a>
                          <span className="text-xs text-neutral-500 truncate max-w-[150px]">{attachment.filename}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-neutral-50 border border-neutral-200 rounded-lg">
                          <span className="material-symbols-outlined text-sm text-neutral-600">attach_file</span>
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 hover:text-primary-700 truncate"
                          >
                            {attachment.filename}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* --- Reactions và Actions đặt ở đây --- */}
          <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-neutral-200">
            <div className="flex flex-wrap items-center gap-2">
              {groupedReactions.map(({ emoji, count }) => (
                <button
                  key={emoji}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors"
                  title={emoji}
                >
                  {emoji} <span className="text-neutral-600">{count}</span>
                </button>
              ))}
              <button
                className="inline-flex items-center justify-center w-6 h-6 text-lg bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Add reaction"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <button
                onClick={() => setActiveReplyId(isReplying ? null : comment._id)}
                className="px-2 py-1 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
              >
                {isReplying ? "Cancel" : "Reply"}
              </button>
              {isOwner && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-2 py-1 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emoji picker nằm ngoài luồng bình thường */}
      {showEmojiPicker && (
        <div className="p-2 bg-white rounded-lg border border-neutral-200 shadow-lg">
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* Form Reply */}
      {isReplying && (
        <form onSubmit={handlePostReply} className="ml-11 p-3 space-y-2 bg-neutral-50 rounded-lg border border-neutral-200">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={`Replying to ${comment.userId.fullname}...`}
            rows="2"
            autoFocus
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
          <button
            type="submit"
            className="w-full px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Post Reply
          </button>
        </form>
      )}

      {/* Render comment con (đệ quy) */}
      {comment.children && comment.children.length > 0 && (
        <div className="ml-11 mt-3 space-y-3 pl-3 border-l-2 border-neutral-200">
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
