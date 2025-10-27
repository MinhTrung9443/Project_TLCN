import React from "react";

const GanttTaskBar = ({ task, barStyle }) => {
  return (
    <div className="gantt-row gantt-row-task">
      <div className="gantt-right">
        <div className="gantt-timeline">
          <div className="gantt-bar gantt-bar-task" style={barStyle} title={`${task.startDate} - ${task.endDate}`}>
            <span className="gantt-bar-label">{task.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttTaskBar;
