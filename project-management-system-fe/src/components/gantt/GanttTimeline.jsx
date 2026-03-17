import React from "react";

const GanttTimeline = ({ timelineColumns, columnWidth = 120 }) => {
  return (
    <div className="flex bg-slate-50">
      <div className="flex bg-slate-50">
        {timelineColumns.map((col, idx) => (
          <div
            key={idx}
            className="h-14 border-r border-slate-200 px-3 py-2 flex items-center justify-center text-center"
            style={{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }}
          >
            <div className="flex flex-col items-center justify-center gap-0.5">
              <div className="text-xs font-semibold text-slate-700">{col.label}</div>
              <div className="text-xs text-slate-500">{col.sublabel}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GanttTimeline;
