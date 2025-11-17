import React, { useRef, useEffect } from "react";
import GanttFilterPanel from "./GanttFilterPanel";

const GanttHeader = ({
  filter,
  setFilter,
  showFilterPanel,
  setShowFilterPanel,
  groupBy,
  showGroupByPanel,
  setShowGroupByPanel,
  handleGroupByChange,
  timeView,
  setTimeView,
  statistics = { atRisk: 0, done: 0, delay: 0, inProgress: 0, unplanned: 0, total: 0 },
}) => {
  const groupByRef = useRef(null);
  const filterRef = useRef(null);

  // Calculate total filter count
  const filterCount = filter.projectIds.length + filter.groupIds.length + filter.assigneeIds.length + (filter.includeUnassigned ? 1 : 0);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (groupByRef.current && !groupByRef.current.contains(event.target)) {
        setShowGroupByPanel(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowGroupByPanel, setShowFilterPanel]);

  return (
    <div className="gantt-header">
      <div className="gantt-header-left">
        <div style={{ position: "relative" }}>
          <button className={`gantt-filter-btn ${filterCount > 0 ? "active" : ""}`} onClick={() => setShowFilterPanel(!showFilterPanel)}>
            <span className="material-symbols-outlined">filter_alt</span>
            Filter ({filterCount})
          </button>

          <GanttFilterPanel filter={filter} setFilter={setFilter} showFilterPanel={showFilterPanel} filterRef={filterRef} />
        </div>

        <div ref={groupByRef} style={{ position: "relative" }}>
          <button className="gantt-groupby-btn" onClick={() => setShowGroupByPanel(!showGroupByPanel)}>
            <span className="material-symbols-outlined">view_list</span>
            Group by ({groupBy.length})
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
          {statistics.atRisk > 0 && <span className="status-badge status-at-risk">{statistics.atRisk} At Risk</span>}
          {statistics.done > 0 && <span className="status-badge status-done">{statistics.done} Done</span>}
          {statistics.delay > 0 && <span className="status-badge status-delay">{statistics.delay} Delay</span>}
          {statistics.inProgress > 0 && <span className="status-badge status-in-progress">{statistics.inProgress} In Progress</span>}
          {statistics.unplanned > 0 && <span className="status-badge status-unplanned">{statistics.unplanned} Unplanned</span>}
          {statistics.total === 0 && <span className="status-badge status-empty">No tasks</span>}
        </div>
        <input type="text" className="gantt-search" placeholder="Search" />
      </div>
    </div>
  );
};

export default GanttHeader;
