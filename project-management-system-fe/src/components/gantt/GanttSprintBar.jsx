import React from "react";
import { formatDate } from "./ganttUtils";

const GanttSprintBar = ({ sprint, barStyle }) => {
  // Kiểm tra xem startDate và endDate có tồn tại không
  const hasValidDates = sprint.startDate && sprint.endDate;

  if (!hasValidDates) {
    // Không hiển thị thanh timeline nếu thiếu ngày
    return (
      <div className="gantt-row gantt-row-sprint">
        <div className="gantt-right">
          <div className="gantt-timeline">{/* Không hiển thị bar */}</div>
        </div>
      </div>
    );
  }

  // Determine status class
  const getStatusClass = () => {
    const status = sprint.status?.toLowerCase() || "";
    const today = new Date();
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);

    if (status === "completed" || status === "done") {
      return "status-completed";
    }
    if (status === "active" || (startDate <= today && endDate >= today)) {
      return "status-active";
    }
    if (startDate > today) {
      return "status-planned";
    }

    return "status-active"; // Default
  };

  const tooltip = `${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}`;
  const statusClass = getStatusClass();

  return (
    <div className="gantt-row gantt-row-sprint">
      <div className="gantt-right">
        <div className="gantt-timeline">
          <div className={`gantt-bar gantt-bar-sprint ${statusClass}`} style={barStyle} title={tooltip} />
        </div>
      </div>
    </div>
  );
};

export default GanttSprintBar;
