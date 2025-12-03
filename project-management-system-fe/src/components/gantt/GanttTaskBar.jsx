import React from "react";
import { formatDate } from "./ganttUtils";

const GanttTaskBar = ({ task, barStyle }) => {
  // Task có thể dùng dueDate thay vì endDate
  const endDate = task.dueDate || task.endDate;

  // Kiểm tra xem startDate và endDate có tồn tại không
  const hasValidDates = task.startDate && endDate;

  if (!hasValidDates) {
    // Không hiển thị thanh timeline nếu thiếu ngày
    return (
      <div className="gantt-row gantt-row-task">
        <div className="gantt-right">
          <div className="gantt-timeline">{/* Không hiển thị bar */}</div>
        </div>
      </div>
    );
  }

  // Determine status class based on task status and dates
  const getStatusClass = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const statusCategory = task.statusId?.category?.toLowerCase() || task.status?.category?.toLowerCase() || "";
    const dueDate = new Date(endDate);

    // Done
    if (statusCategory === "done") {
      return "status-done";
    }

    // In Progress
    if (statusCategory === "in progress") {
      return "status-in-progress";
    }

    // Delay - past due date and not done
    if (dueDate < today && statusCategory !== "done") {
      return "status-delay";
    }

    // At Risk - due soon (within 3 days) and not done
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntilDue >= 0 && daysUntilDue <= 3 && statusCategory !== "done") {
      return "status-at-risk";
    }

    // Not started
    if (statusCategory === "to do" || statusCategory === "todo") {
      return "status-not-started";
    }

    return "status-in-progress"; // Default
  };

  const tooltip = `${formatDate(task.startDate)} - ${formatDate(endDate)}`;
  const statusClass = getStatusClass();

  return (
    <div className="gantt-row gantt-row-task">
      <div className="gantt-right">
        <div className="gantt-timeline">
          <div className={`gantt-bar gantt-bar-task ${statusClass}`} style={barStyle} title={tooltip}>
            <span className="gantt-bar-label">{task.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttTaskBar;
