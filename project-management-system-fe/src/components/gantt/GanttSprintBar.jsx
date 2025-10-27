import React from "react";

const GanttSprintBar = ({ sprint, barStyle }) => {
  return (
    <div className="gantt-row gantt-row-sprint">
      <div className="gantt-right">
        <div className="gantt-timeline">
          <div className="gantt-bar gantt-bar-sprint" style={barStyle} title={`${sprint.startDate} - ${sprint.endDate}`} />
        </div>
      </div>
    </div>
  );
};

export default GanttSprintBar;
