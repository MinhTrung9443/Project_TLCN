import React, { useState, useEffect } from "react";
import timeLogService from "../../services/timeLogService";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import ConfirmationModal from "../common/ConfirmationModal";

const TimeLogList = ({ taskId, onTimeLogsUpdate }) => {
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTimeLogId, setDeleteTimeLogId] = useState(null);

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

  const handleDelete = async () => {
    try {
      await timeLogService.deleteTimeLog(deleteTimeLogId);
      toast.success("Time log deleted");
      fetchTimeLogs();
      setIsDeleteModalOpen(false);
      setDeleteTimeLogId(null);
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
    return <div className="flex items-center justify-center py-6 text-neutral-500">Loading time logs...</div>;
  }

  if (timeLogs.length === 0) {
    return <div className="text-center py-6 text-neutral-500">No time logs yet</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          <span className="material-symbols-outlined">history</span>
          Work Log ({timeLogs.length})
        </h4>
        <span className="text-sm text-neutral-600">Total: {formatDuration(timeLogs.reduce((sum, log) => sum + log.timeSpent, 0))}</span>
      </div>

      {timeLogs.map((log) => (
        <div
          key={log._id}
          className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {(log.userId?.fullname || "U")[0]}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-neutral-900">{log.userId?.fullname || "Unknown"}</span>
              <span className="text-xs text-neutral-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">schedule</span>
                {formatDuration(log.timeSpent)}
              </span>
              <span className="text-xs text-neutral-500">{formatDate(log.createdAt)}</span>
            </div>

            <div className="text-sm text-neutral-700 break-words">{log.comment}</div>
          </div>

          {user?._id === log.userId?._id && (
            <button
              className="p-2 text-neutral-600 hover:text-red-600 transition-colors flex-shrink-0"
              onClick={() => {
                setDeleteTimeLogId(log._id);
                setIsDeleteModalOpen(true);
              }}
              title="Delete"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          )}
        </div>
      ))}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTimeLogId(null);
        }}
        onConfirm={handleDelete}
        title="Delete Time Log"
        message="Are you sure you want to delete this time log? This action cannot be undone."
      />
    </div>
  );
};

export default TimeLogList;
