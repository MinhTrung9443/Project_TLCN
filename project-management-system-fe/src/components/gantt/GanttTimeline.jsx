import React from "react";

const GanttTimeline = ({ timelineColumns }) => {
  return (
    <div className="flex border-b border-slate-200 bg-slate-50">
      <div className="flex bg-slate-50">
        {timelineColumns.map((col, idx) => (
          <div key={idx} className="h-14 border-r border-slate-200 px-3 py-2 flex items-center justify-center min-w-[120px] text-center">
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
