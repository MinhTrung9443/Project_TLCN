import React from "react";

const GanttProjectRow = ({ project, isExpanded, hasSprints, toggleExpand }) => {
  return (
    <div className="gantt-row gantt-row-project">
      <div className="gantt-left">
        <div className="gantt-item-info">
          {hasSprints && (
            <button className="gantt-expand-btn" onClick={() => toggleExpand(project.id)}>
              <span className="material-symbols-outlined">{isExpanded ? "expand_more" : "chevron_right"}</span>
            </button>
          )}
          {!hasSprints && <div style={{ width: "24px" }} />}
          <div className="gantt-item-icon project-icon">
            <span className="material-symbols-outlined">folder</span>
          </div>
          <span className="gantt-item-name">{project.name}</span>
          <span className="gantt-item-count">{project.sprints?.length || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default GanttProjectRow;
