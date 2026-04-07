import React from "react";

const GanttTaskRow = ({ task }) => {
  return (
    <div className="flex items-center border-b border-slate-100 hover:bg-slate-50 transition-colors h-14">
      <div className="flex items-center gap-2 px-4 flex-1 min-w-0 pl-20">
        <div className="w-6 flex-shrink-0" />
        <div className="flex items-center justify-center h-7 w-7 rounded-md bg-amber-100 flex-shrink-0">
          <span className="material-symbols-outlined text-base text-amber-600">task</span>
        </div>
        <span className="font-medium text-slate-800 truncate text-sm" title={task.name}>
          {task.name}
        </span>
      </div>
    </div>
  );
};

export default GanttTaskRow;
