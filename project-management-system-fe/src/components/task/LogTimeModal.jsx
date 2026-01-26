import React, { useState } from "react";
import timeLogService from "../../services/timeLogService";
import { toast } from "react-toastify";
import Button from "../ui/Button";
import Input from "../ui/Input";

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-90% max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200">
          <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <span className="material-symbols-outlined">schedule</span>
            Log Work Time
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <Input
              label="Time Spent (hours)"
              type="number"
              id="timeSpent"
              step="0.1"
              min="0.1"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              placeholder="e.g., 2.5"
              required
              autoFocus
              helperText="Enter time in hours (e.g., 0.5 = 30 minutes)"
            />
          </div>

          <div>
            <label htmlFor="comment" className="block text-sm font-semibold text-neutral-900 mb-2">
              Work Description <span className="text-danger-600">*</span>
            </label>
            <textarea
              id="comment"
              rows="4"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe what you worked on..."
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-vertical text-neutral-900"
            />
            <small className="block text-xs text-neutral-600 mt-1 italic">Example: "Fixed login bug", "Implemented user profile page"</small>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={loading} icon={loading ? "sync" : "check"}>
              {loading ? "Logging..." : "Log Time"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogTimeModal;
