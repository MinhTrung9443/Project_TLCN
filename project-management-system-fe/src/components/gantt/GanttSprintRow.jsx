import React from "react";

const GanttSprintRow = ({ sprint, isExpanded, hasTasks, toggleExpand }) => {
  return (
    <div className="gantt-row gantt-row-sprint">
      <div className="gantt-left">
        <div className="gantt-item-info gantt-item-nested">
          {hasTasks && (
            <button className="gantt-expand-btn" onClick={() => toggleExpand(sprint.id)}>
              <span className="material-symbols-outlined">{isExpanded ? "expand_more" : "chevron_right"}</span>
            </button>
          )}
          {!hasTasks && <div style={{ width: "24px" }} />}
          <div className="gantt-item-icon sprint-icon">
            <span className="material-symbols-outlined">sprint</span>
          </div>
          <span className="gantt-item-name">{sprint.name}</span>
          <span className="gantt-item-count">{sprint.tasks?.length || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default GanttSprintRow;
