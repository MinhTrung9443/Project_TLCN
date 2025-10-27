import React from "react";

const GanttGridOverlay = ({ timelineColumns }) => {
  return (
    <div className="gantt-grid-overlay">
      {timelineColumns.map((col, idx) => (
        <div key={idx} className="gantt-grid-line" />
      ))}
    </div>
  );
};

export default GanttGridOverlay;
