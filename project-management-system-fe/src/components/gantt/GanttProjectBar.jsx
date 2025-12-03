import React from "react";
import { formatDate } from "./ganttUtils";

const GanttProjectBar = ({ project, barStyle }) => {
  // Kiểm tra xem startDate và endDate có tồn tại không
  const hasValidDates = project.startDate && project.endDate;

  if (!hasValidDates) {
    // Không hiển thị thanh timeline nếu thiếu ngày
    return (
      <div className="gantt-row gantt-row-project">
        <div className="gantt-right">
          <div className="gantt-timeline">{/* Không hiển thị bar */}</div>
        </div>
      </div>
    );
  }

  // Determine status class
  const getStatusClass = () => {
    const status = project.status?.toLowerCase() || "";

    if (status === "completed") {
      return "status-done";
    }
    if (status === "active") {
      return "status-in-progress";
    }
    if (status === "paused") {
      return "status-paused";
    }

    return "status-in-progress"; // Default
  };

  const tooltip = `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`;
  const statusClass = getStatusClass();

  return (
    <div className="gantt-row gantt-row-project">
      <div className="gantt-right">
        <div className="gantt-timeline">
          <div className={`gantt-bar gantt-bar-project ${statusClass}`} style={barStyle} title={tooltip}>
            <span className="gantt-bar-label">{project.key}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttProjectBar;
