import React, { useState } from "react";
import timeLogService from "../../services/timeLogService";
import { toast } from "react-toastify";
import "../../styles/components/task/LogTimeModal.css";

const LogTimeModal = ({ isOpen, onClose, taskId, onTimeLogged }) => {
  const [timeSpent, setTimeSpent] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!timeSpent || timeSpent <= 0) {
      toast.error("Please enter valid time spent");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please describe what you worked on");
      return;
    }

    try {
      setLoading(true);
      const response = await timeLogService.createTimeLog(taskId, parseFloat(timeSpent), comment);

      toast.success("Time logged successfully!");

      // Reset form
      setTimeSpent("");
      setComment("");

      // Callback to parent
      if (onTimeLogged) {
        onTimeLogged(response.data);
      }

      onClose();
    } catch (error) {
      console.error("Error logging time:", error);
      toast.error(error.response?.data?.message || "Failed to log time");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="log-time-modal-overlay" onClick={onClose}>
      <div className="log-time-modal" onClick={(e) => e.stopPropagation()}>
        <div className="log-time-modal-header">
          <h3>
            <span className="material-symbols-outlined">schedule</span>
            Log Work Time
          </h3>
          <button className="close-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="log-time-modal-body">
          <div className="form-group">
            <label htmlFor="timeSpent">
              Time Spent (hours) <span className="required">*</span>
            </label>
            <input
              type="number"
              id="timeSpent"
              step="0.1"
              min="0.1"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              placeholder="e.g., 2.5"
              required
              autoFocus
            />
            <small className="hint">Enter time in hours (e.g., 0.5 = 30 minutes)</small>
          </div>

          <div className="form-group">
            <label htmlFor="comment">
              Work Description <span className="required">*</span>
            </label>
            <textarea
              id="comment"
              rows="4"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe what you worked on..."
              required
            />
            <small className="hint">Example: "Fixed login bug", "Implemented user profile page"</small>
          </div>

          <div className="log-time-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Logging...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">check</span>
                  Log Time
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogTimeModal;
