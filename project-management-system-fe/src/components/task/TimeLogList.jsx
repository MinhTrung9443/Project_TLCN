import React, { useState, useEffect } from "react";
import timeLogService from "../../services/timeLogService";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/components/task/TimeLogList.css";

const TimeLogList = ({ taskId, onTimeLogsUpdate }) => {
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (taskId) {
      fetchTimeLogs();
    }
  }, [taskId]);

  const fetchTimeLogs = async () => {
    try {
      setLoading(true);
      const response = await timeLogService.getTimeLogsByTask(taskId);
      setTimeLogs(response.data || []);

      // Callback để update tổng thời gian
      if (onTimeLogsUpdate) {
        const total = (response.data || []).reduce((sum, log) => sum + log.timeSpent, 0);
        onTimeLogsUpdate(total);
      }
    } catch (error) {
      console.error("Error fetching time logs:", error);
      toast.error("Failed to load time logs");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (timeLogId) => {
    if (!window.confirm("Are you sure you want to delete this time log?")) {
      return;
    }

    try {
      await timeLogService.deleteTimeLog(timeLogId);
      toast.success("Time log deleted");
      fetchTimeLogs();
    } catch (error) {
      console.error("Error deleting time log:", error);
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  const formatDuration = (hours) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  if (loading) {
    return (
      <div className="time-log-loading">
        <div className="spinner"></div>
        <span>Loading time logs...</span>
      </div>
    );
  }

  if (timeLogs.length === 0) {
    return (
      <div className="time-log-empty">
        <span className="material-symbols-outlined">schedule</span>
        <p>No time logged yet</p>
        <small>Click "Log Time" to start tracking your work</small>
      </div>
    );
  }

  return (
    <div className="time-log-list">
      <div className="time-log-header">
        <h4>
          <span className="material-symbols-outlined">history</span>
          Work Log ({timeLogs.length})
        </h4>
        <span className="total-time">Total: {formatDuration(timeLogs.reduce((sum, log) => sum + log.timeSpent, 0))}</span>
      </div>

      <div className="time-log-items">
        {timeLogs.map((log) => (
          <div key={log._id} className="time-log-item">
            <div className="time-log-avatar">
              {log.userId?.avatar ? (
                <img src={log.userId.avatar} alt={log.userId.fullname} />
              ) : (
                <span className="material-symbols-outlined">person</span>
              )}
            </div>

            <div className="time-log-content">
              <div className="time-log-meta">
                <span className="time-log-author">{log.userId?.fullname || "Unknown"}</span>
                <span className="time-log-duration">
                  <span className="material-symbols-outlined">schedule</span>
                  {formatDuration(log.timeSpent)}
                </span>
                <span className="time-log-date">{formatDate(log.createdAt)}</span>
              </div>

              <div className="time-log-comment">{log.comment}</div>

              {user?._id === log.userId?._id && (
                <div className="time-log-actions">
                  <button className="time-log-delete-btn" onClick={() => handleDelete(log._id)} title="Delete">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeLogList;
