import React from "react";

const GanttHeader = ({
  filter,
  showFilterPanel,
  setShowFilterPanel,
  groupBy,
  showGroupByPanel,
  setShowGroupByPanel,
  handleGroupByChange,
  timeView,
  setTimeView,
  
}) => {
  return (
    <div className="gantt-header">
      <div className="gantt-header-left">
        <button
          className={`gantt-filter-btn ${Object.keys(filter).some((k) => filter[k]?.length > 0) ? "active" : ""}`}
          onClick={() => setShowFilterPanel(!showFilterPanel)}
        >
          <span className="material-symbols-outlined">filter_alt</span>
          Filter (0)
        </button>

        <button className="gantt-groupby-btn" onClick={() => setShowGroupByPanel(!showGroupByPanel)}>
          Group by {groupBy.length} Project
        </button>

        {/* Group By Dropdown */}
        {showGroupByPanel && (
          <div className="gantt-dropdown gantt-groupby-dropdown">
            <div className="gantt-dropdown-header">GROUP BY</div>
            <label className="gantt-dropdown-item">
              <input type="checkbox" checked={groupBy.includes("project")} onChange={() => handleGroupByChange("project")} />
              <span>Project</span>
            </label>
            <label className="gantt-dropdown-item">
              <input type="checkbox" checked={groupBy.includes("sprint")} onChange={() => handleGroupByChange("sprint")} />
              <span>Sprint</span>
            </label>
            <label className="gantt-dropdown-item">
              <input type="checkbox" checked={groupBy.includes("task")} onChange={() => handleGroupByChange("task")} />
              <span>Task</span>
            </label>
          </div>
        )}
      </div>

      <div className="gantt-header-center">
        <select className="gantt-timeview-select" value={timeView} onChange={(e) => setTimeView(e.target.value)}>
          <option value="weeks">Weeks</option>
          <option value="months">Months</option>
          <option value="years">Years</option>
        </select>
      </div>

      <div className="gantt-header-right">
        <div className="gantt-status-badges">
          <span className="status-badge status-at-risk">1 At Risk</span>
          <span className="status-badge status-done">1 Done</span>
          <span className="status-badge status-delay">20 Delay</span>
          <span className="status-badge status-in-progress">1 In Progress</span>
          <span className="status-badge status-unplanned">38 Unplanned</span>
        </div>
        <input type="text" className="gantt-search" placeholder="Search" />
      </div>
    </div>
  );
};

export default GanttHeader;
