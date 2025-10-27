import React from "react";

const GanttTimeline = ({ timelineColumns }) => {
  return (
    <div className="gantt-right-header">
      <div className="gantt-timeline-header">
        {timelineColumns.map((col, idx) => (
          <div key={idx} className="gantt-timeline-col">
            <div className="gantt-timeline-label">{col.label}</div>
            <div className="gantt-timeline-sublabel">{col.sublabel}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GanttTimeline;
