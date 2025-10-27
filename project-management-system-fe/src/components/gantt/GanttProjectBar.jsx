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

  const tooltip = `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`;

  return (
    <div className="gantt-row gantt-row-project">
      <div className="gantt-right">
        <div className="gantt-timeline">
          <div className="gantt-bar gantt-bar-project" style={barStyle} title={tooltip}>
            <span className="gantt-bar-label">{project.key}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttProjectBar;
