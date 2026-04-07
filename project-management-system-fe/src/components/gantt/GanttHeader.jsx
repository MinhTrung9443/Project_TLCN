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
  statusFilter,
  setStatusFilter,
  statistics = { atRisk: 0, done: 0, delay: 0, inProgress: 0, unplanned: 0, total: 0 },
  searchKeyword,
  setSearchKeyword,
}) => {
  const groupByRef = useRef(null);
  const filterRef = useRef(null);
  const statusRef = useRef(null);
  const [showStatusPanel, setShowStatusPanel] = React.useState(false);

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
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setShowStatusPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowGroupByPanel, setShowFilterPanel]);

  return (
    <>
      <div className="border-b border-slate-200 bg-white">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
              <span className="material-symbols-outlined text-sky-600 text-xl">timeline</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">Gantt Chart</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                  <span className="material-symbols-outlined text-base">schedule</span>
                  Timeline Management
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Visualize project schedules and track task progress across all sprints</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex flex-wrap items-center gap-3 lg:gap-4">
            <div className="flex items-center gap-2">
              <div ref={filterRef} className="relative">
                <button
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    filterCount > 0 ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                >
                  <span className="material-symbols-outlined text-base">filter_alt</span>
                  <span>Filter</span>
                  {filterCount > 0 && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                      {filterCount}
                    </span>
                  )}
                </button>
                <GanttFilterPanel filter={filter} setFilter={setFilter} showFilterPanel={showFilterPanel} filterRef={filterRef} />
              </div>

              <div ref={groupByRef} className="relative">
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => setShowGroupByPanel(!showGroupByPanel)}
                >
                  <span className="material-symbols-outlined text-base">view_list</span>
                  <span>Group By</span>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                    {groupBy.length}
                  </span>
                </button>

                {showGroupByPanel && (
                  <div className="absolute top-10 left-0 z-10 min-w-[200px] rounded-lg border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Group By</div>
                    <label className="flex cursor-pointer items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={groupBy.includes("project")}
                        onChange={() => handleGroupByChange("project")}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-slate-700">Project</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={groupBy.includes("sprint")}
                        onChange={() => handleGroupByChange("sprint")}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-slate-700">Sprint</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-200">
                      <input type="checkbox" checked={groupBy.includes("task")} onChange={() => handleGroupByChange("task")} className="h-4 w-4" />
                      <span className="text-sm text-slate-700">Task</span>
                    </label>
                  </div>
                )}
              </div>

              <div ref={statusRef} className="relative">
                <button
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    statusFilter !== "active"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => setShowStatusPanel(!showStatusPanel)}
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>
                    {statusFilter === "active" ? "Active" : statusFilter === "all" ? "All" : statusFilter === "completed" ? "Completed" : "Paused"}
                  </span>
                </button>

                {showStatusPanel && (
                  <div className="absolute top-10 left-0 z-10 min-w-[220px] rounded-lg border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Project Status
                    </div>
                    {[
                      { value: "active", label: "Active Projects", icon: "play_circle" },
                      { value: "all", label: "All Projects", icon: "all_inclusive" },
                      { value: "completed", label: "Completed Projects", icon: "task_alt" },
                      { value: "paused", label: "Paused Projects", icon: "pause_circle" },
                    ].map((option) => (
                      <div
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-2 px-4 py-2.5 transition-colors ${
                          statusFilter === option.value ? "bg-sky-50" : "hover:bg-slate-50"
                        } ${option.value === "paused" ? "border-b border-slate-200" : ""}`}
                        onClick={() => {
                          setStatusFilter(option.value);
                          setShowStatusPanel(false);
                        }}
                      >
                        <span className={`material-symbols-outlined text-base ${statusFilter === option.value ? "text-sky-600" : "text-slate-600"}`}>
                          {option.icon}
                        </span>
                        <span className={`text-sm ${statusFilter === option.value ? "font-semibold text-sky-700" : "text-slate-700"}`}>
                          {option.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <input
                type="text"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                placeholder="Search tasks..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />

              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                value={timeView}
                onChange={(e) => setTimeView(e.target.value)}
              >
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GanttHeader;
