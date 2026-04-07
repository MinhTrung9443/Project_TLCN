import React from "react";

const GanttSprintRow = ({ sprint, isExpanded, hasTasks, toggleExpand }) => {
  return (
    <div className="flex items-center border-b border-slate-100 hover:bg-slate-50 transition-colors h-14">
      <div className="flex items-center gap-2 px-4 flex-1 min-w-0 pl-11">
        {hasTasks && (
          <button
            className="flex items-center justify-center h-6 w-6 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors flex-shrink-0"
            onClick={() => toggleExpand(sprint.id)}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <span className="material-symbols-outlined text-base">{isExpanded ? "expand_more" : "chevron_right"}</span>
          </button>
        )}
        {!hasTasks && <div className="w-6 flex-shrink-0" />}
        <div className="flex items-center justify-center h-7 w-7 rounded-md bg-emerald-100 flex-shrink-0">
          <span className="material-symbols-outlined text-base text-emerald-600">sprint</span>
        </div>
        <span className="font-semibold text-slate-900 truncate text-sm" title={sprint.name}>
          {sprint.name}
        </span>
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-200 text-xs font-bold text-slate-600 ml-auto flex-shrink-0">
          {sprint.tasks?.length || 0}
        </span>
      </div>
    </div>
  );
};

export default GanttSprintRow;
