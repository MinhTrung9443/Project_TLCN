// In frontend/src/pages/ManageTask/TaskDetailPage.js
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getTaskByKey } from "../../services/taskService";
import TaskDetailPanel from "../../components/task/TaskDetailPanel";
import "../../styles/pages/ManageTask/TaskDetailPage.css"; // Tạo file CSS mới nếu cần

const TaskDetailPage = () => {
  const { taskKey } = useParams();
  const navigate = useNavigate();
  const hasShownError = useRef(false); // Prevent duplicate error messages

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      hasShownError.current = false; // Reset flag
      try {
        const response = await getTaskByKey(taskKey);
        setTask(response.data);
      } catch (error) {
        // Prevent duplicate toast messages
        if (hasShownError.current) return;
        hasShownError.current = true;

        const status = error.response?.status;
        const message = error.response?.data?.message;

        // Xử lý các trường hợp cụ thể
        if (status === 410) {
          // Task hoặc project đã bị xóa
          toast.error(message || `Task ${taskKey} has been deleted.`);
        } else if (status === 403) {
          // Project không active (paused/completed)
          toast.error(message || `This task belongs to a non-active project.`);
        } else if (status === 404) {
          // Task không tồn tại
          toast.error(`Task ${taskKey} not found.`);
        } else {
          // Lỗi khác
          toast.error(message || `Could not load task ${taskKey}.`);
        }

        // Điều hướng về trang task finder
        setTimeout(() => navigate("/task-finder"), 1500);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskKey]); // Chỉ re-run khi taskKey thay đổi

  // Hàm này cần thiết cho TaskDetailPanel, nhưng chúng ta sẽ cập nhật task tại chỗ
  const handleTaskUpdate = (updatedData) => {
    // Nếu API trả về một mảng (ví dụ khi link task), tìm task hiện tại
    if (Array.isArray(updatedData)) {
      const currentTaskUpdate = updatedData.find((t) => t.key === taskKey);
      if (currentTaskUpdate) setTask(currentTaskUpdate);
    } else if (updatedData?._id === task?._id) {
      setTask(updatedData);
    }
  };

  // Xử lý khi xóa task, điều hướng người dùng đi
  const handleTaskDelete = () => {
    toast.success(`Task ${taskKey} deleted.`);
    navigate("/task-finder");
  };

  if (loading) {
    return <div className="loading-container">Loading task...</div>;
  }

  if (!task) {
    return <div className="loading-container">Task not found.</div>;
  }

  return (
    <div className="task-detail-page-wrapper">
      {/* 
        Tái sử dụng TaskDetailPanel.
        Chúng ta truyền một hàm onClose giả để nó không bị lỗi, 
        vì ở đây không có panel để đóng.
      */}
      <TaskDetailPanel
        task={task}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
        onClose={() => {}} // onClose không cần thiết trong view này
        // onTaskClone có thể được giữ lại
      />
    </div>
  );
};

export default TaskDetailPage;
