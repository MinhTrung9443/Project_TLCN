import React from "react";

const GanttProjectBar = ({ project, barStyle }) => {
  return (
    <div className="gantt-row gantt-row-project">
      <div className="gantt-right">
        <div className="gantt-timeline">
          <div className="gantt-bar gantt-bar-project" style={barStyle} title={`${project.startDate} - ${project.endDate}`}>
            <span className="gantt-bar-label">{project.key}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttProjectBar;
