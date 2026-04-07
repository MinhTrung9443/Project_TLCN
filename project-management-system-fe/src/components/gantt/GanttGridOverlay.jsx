import React from "react";

const GanttGridOverlay = ({ timelineColumns }) => {
  return (
    <div className="absolute inset-0 flex pointer-events-none z-0">
      {timelineColumns.map((col, idx) => (
        <div key={idx} className="flex-1 border-r border-slate-200" />
      ))}
    </div>
  );
};

export default GanttGridOverlay;
