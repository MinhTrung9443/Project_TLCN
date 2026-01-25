import React, { useState } from "react";
import timeLogService from "../../services/timeLogService";
import { toast } from "react-toastify";

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
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined">schedule</span>
            Log Work Time
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="timeSpent" className="block text-sm font-semibold text-gray-900 mb-2">
              Time Spent (hours) <span className="text-red-600">*</span>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <small className="block text-xs text-gray-600 mt-1 italic">Enter time in hours (e.g., 0.5 = 30 minutes)</small>
          </div>

          <div>
            <label htmlFor="comment" className="block text-sm font-semibold text-gray-900 mb-2">
              Work Description <span className="text-red-600">*</span>
            </label>
            <textarea
              id="comment"
              rows="4"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe what you worked on..."
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-vertical"
            />
            <small className="block text-xs text-gray-600 mt-1 italic">Example: "Fixed login bug", "Implemented user profile page"</small>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-purple-300 border-t-white rounded-full animate-spin"></div>
                  Logging...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">check</span>
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
