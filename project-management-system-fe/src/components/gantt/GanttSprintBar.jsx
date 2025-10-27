import React from "react";
import { formatDate } from "./ganttUtils";

const GanttSprintBar = ({ sprint, barStyle }) => {
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
