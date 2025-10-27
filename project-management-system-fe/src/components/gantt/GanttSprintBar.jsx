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

  const tooltip = `${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}`;

  return (
    <div className="gantt-row gantt-row-sprint">
      <div className="gantt-right">
        <div className="gantt-timeline">
          <div className="gantt-bar gantt-bar-sprint" style={barStyle} title={tooltip} />
        </div>
      </div>
    </div>
  );
};

export default GanttSprintBar;
