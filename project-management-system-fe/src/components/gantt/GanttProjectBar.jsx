import React from "react";
import { formatDate } from "./ganttUtils";

const GanttProjectBar = ({ project, barStyle }) => {
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
