import React from "react";

const GanttTaskRow = ({ task }) => {
  return (
    <div className="gantt-row gantt-row-task">
      <div className="gantt-left">
        <div className="gantt-item-info gantt-item-nested-2">
          <div style={{ width: "24px" }} />
          <div className="gantt-item-icon task-icon">
            <span className="material-symbols-outlined">task</span>
          </div>
          <span className="gantt-item-name" title={task.name}>
            {task.name}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GanttTaskRow;
