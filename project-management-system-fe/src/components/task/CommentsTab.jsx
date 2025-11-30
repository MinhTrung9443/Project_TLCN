// src/components/task/CommentsTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import apiClient from "../../services/apiClient";
import CommentItem from "./CommentItem";

const CommentsTab = ({ taskId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // <-- THÊM: State để xử lý lỗi
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
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
    if (newComment.trim() === "" && selectedFiles.length === 0) return; // Không gửi comment rỗng và không có file

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("content", newComment);

      // Thêm files vào formData
      selectedFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      const { data: postedComment } = await apiClient.post(`/tasks/${taskId}/comments`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setComments((prevComments) => [...prevComments, postedComment]);
      setNewComment(""); // Xóa nội dung trong ô nhập liệu
      setSelectedFiles([]); // Xóa files đã chọn
    } catch (error) {
      console.error("Failed to post comment:", error);
      alert("There was an error posting your comment."); // Thông báo lỗi đơn giản
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCommentUpdated = (updatedComment) => {
    setComments(comments.map((c) => (c._id === updatedComment._id ? updatedComment : c)));
  };

  const handleCommentDeleted = (commentId) => {
    setComments(comments.filter((c) => c._id !== commentId));
  };

  const commentTree = useMemo(() => {
    const commentMap = {};
    const rootComments = [];

    // Đưa tất cả comment vào một map để truy cập nhanh
    comments.forEach((comment) => {
      commentMap[comment._id] = { ...comment, children: [] };
    });

    // Lặp lại để xây dựng cây
    comments.forEach((comment) => {
      if (comment.parentId && commentMap[comment.parentId]) {
        // Nếu là comment con, thêm vào mảng children của cha
        commentMap[comment.parentId].children.push(commentMap[comment._id]);
      } else {
        // Nếu là comment gốc, thêm vào root
        rootComments.push(commentMap[comment._id]);
      }
    });
    return rootComments;
  }, [comments]);
  const renderContent = () => {
    if (loading) return <div>Loading...</div>;
    if (error) return <div style={{ color: "red" }}>{error}</div>;
    if (commentTree.length === 0) return <div>No comments yet.</div>;

    return commentTree.map((comment) => (
      <CommentItem
        key={comment._id}
        comment={comment}
        onCommentUpdated={handleCommentUpdated}
        onCommentDeleted={handleCommentDeleted}
        // --- TRUYỀN PROPS MỚI XUỐNG ---
        activeReplyId={activeReplyId}
        setActiveReplyId={setActiveReplyId}
      />
    ));
  };
  return (
    <div className="comments-section">
      <div className="comment-list">{renderContent()}</div>
      <form onSubmit={handlePostComment} className="comment-form">
        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." rows="3" />

        <div className="comment-attachments">
          <label htmlFor="comment-file-upload" className="file-upload-label">
            <span className="material-symbols-outlined">attach_file</span>
            Attach files
          </label>
          <input id="comment-file-upload" type="file" multiple onChange={handleFileChange} style={{ display: "none" }} />

          {selectedFiles.length > 0 && (
            <div className="selected-files-list">
              {selectedFiles.map((file, index) => (
                <div key={index} className="selected-file-item">
                  <span>{file.name}</span>
                  <button type="button" onClick={() => handleRemoveFile(index)} className="remove-file-btn">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={uploading}>
          {uploading ? "Posting..." : "Post Comment"}
        </button>
      </form>
    </div>
  );
};

export default CommentsTab;
