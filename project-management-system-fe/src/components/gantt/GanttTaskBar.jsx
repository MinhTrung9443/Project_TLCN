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
    const statusCategory = (task.status?.category || task.statusId?.category || "").toString().toLowerCase();
    const dueDate = new Date(endDate);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    // If task is marked done AND lastLogTime exists and lastLogTime <= dueDate => completed on time (green)
    if (statusCategory === "done") {
      if (task.lastLogTime) {
        const lastLog = new Date(task.lastLogTime);
        lastLog.setHours(0, 0, 0, 0);
        if (lastLog <= dueDate) return "status-done"; // completed on time
      }
      // If done but no lastLog or lastLog after dueDate, fall through to check overdue
    }

    // Overdue (past due) -> red (regardless of done)
    if (dueDate < today) {
      return "status-delay";
    }

    // Upcoming due (within 3 days) -> orange
    if (daysUntilDue >= 0 && daysUntilDue <= 3) {
      return "status-at-risk";
    }

    // Default: use in-progress or not-started mapping
    if (statusCategory === "to do" || statusCategory === "todo") return "status-not-started";
    if (statusCategory === "in progress" || statusCategory === "in-progress") return "status-in-progress";

    return "status-in-progress";
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
