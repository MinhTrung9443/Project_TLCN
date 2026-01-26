import React, { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import moment from "moment";

const HistoryTab = ({ taskId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/tasks/${taskId}/history`);
        setHistory(data);
      } catch (error) {
        console.error("Failed to fetch history", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [taskId]);

  const getFieldLabel = (fieldName) => {
    const labels = {
      name: "Title",
      description: "Description",
      statusId: "Status",
      assigneeId: "Assignee",
      reporterId: "Reporter",
      priorityId: "Priority",
      platformId: "Platform",
      taskTypeId: "Type",
      sprintId: "Sprint",
      dueDate: "Due Date",
    };
    return labels[fieldName] || fieldName.replace(/Id$/, "");
  };

  const formatHistoryMessage = (item) => {
    const user = item.userId?.fullname || "Unknown user";
    const field = getFieldLabel(item.fieldName);

    switch (item.actionType) {
      case "CREATE":
        return (
          <span>
            <strong>{user}</strong> created the task
          </span>
        );
      case "COMMENT":
        return (
          <span>
            <strong>{user}</strong> added a comment
          </span>
        );
      case "UPDATE":
        return (
          <span>
            <strong>{user}</strong> updated <strong>{field}</strong> from{" "}
            <code className="bg-neutral-100 px-1 py-0.5 rounded text-xs">{item.oldValue ? String(item.oldValue).substring(0, 20) : "None"}</code> to{" "}
            <code className="bg-neutral-100 px-1 py-0.5 rounded text-xs">{item.newValue ? String(item.newValue).substring(0, 20) : "None"}</code>
          </span>
        );
      default:
        return <span>An action was performed</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-neutral-500">Loading history...</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-neutral-500">No history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item, index) => (
        <div key={item._id} className="flex gap-3 pb-3 border-b border-neutral-200 last:border-0">
          <div className="flex-shrink-0 pt-1">
            {item.userId?.avatar ? (
              <img src={item.userId.avatar} alt={item.userId.fullname} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                {item.userId?.fullname?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-neutral-900">{formatHistoryMessage(item)}</div>
              <span className="text-xs text-neutral-500 whitespace-nowrap flex-shrink-0">{moment(item.createdAt).fromNow()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryTab;
