import React from "react";
import { formatDate } from "./ganttUtils";

const GanttTaskBar = ({ task, barStyle }) => {
  // Task có thể dùng dueDate thay vì endDate
  const endDate = task.dueDate || task.endDate;
  const tooltip = `${formatDate(task.startDate)} - ${formatDate(endDate)}`;

  return (
    <div className="gantt-row gantt-row-task">
      <div className="gantt-right">
        <div className="gantt-timeline">
          <div className="gantt-bar gantt-bar-task" style={barStyle} title={tooltip}>
            <span className="gantt-bar-label">{task.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttTaskBar;
