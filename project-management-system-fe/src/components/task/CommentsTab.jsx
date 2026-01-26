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
    // Kiểm tra xem comment đã tồn tại chưa
    const exists = comments.some((c) => c._id === updatedComment._id);
    if (exists) {
      // Update comment hiện có
      setComments(comments.map((c) => (c._id === updatedComment._id ? updatedComment : c)));
    } else {
      // Thêm comment mới (reply)
      setComments((prevComments) => [...prevComments, updatedComment]);
    }
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
    <div className="space-y-2">
      <div className="space-y-2">{renderContent()}</div>
      <form onSubmit={handlePostComment} className="space-y-2 p-3 bg-neutral-50 rounded border border-neutral-200">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows="2"
          className="w-full px-2 py-1 text-sm border border-neutral-300 rounded focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 resize-none"
        />

        <div className="space-y-1">
          <label
            htmlFor="comment-file-upload"
            className="inline-flex items-center gap-2 px-2 py-1 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-sm">attach_file</span>
            Attach files
          </label>
          <input id="comment-file-upload" type="file" multiple onChange={handleFileChange} style={{ display: "none" }} />

          {selectedFiles.length > 0 && (
            <div className="space-y-1">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-1.5 bg-white border border-neutral-200 rounded text-sm">
                  <span className="text-xs text-neutral-700 truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="p-0.5 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="w-full px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Posting..." : "Post Comment"}
        </button>
      </form>
    </div>
  );
};

export default CommentsTab;
