import React, { useState, useEffect, useContext, useRef } from "react";
import { ProjectContext } from "../../contexts/ProjectContext";
import "../../styles/pages/Gantt/GanttPage.css";

const GanttPage = () => {
  const { selectedProjectKey } = useContext(ProjectContext);

  // Refs for scroll sync
  const leftSectionRef = useRef(null);
  const rightSectionRef = useRef(null);

  // State
  const [filter, setFilter] = useState({
    projectIds: [],
    groupIds: [],
    assigneeIds: [],
    includeUnassigned: false,
  });
  const [groupBy, setGroupBy] = useState(["project", "sprint", "task"]);
  const [timeView, setTimeView] = useState("weeks"); // weeks, months, years
  const [ganttData, setGanttData] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showGroupByPanel, setShowGroupByPanel] = useState(false);

  // Sync scroll between left and right sections
  useEffect(() => {
    const leftSection = leftSectionRef.current;
    const rightSection = rightSectionRef.current;

    if (!leftSection || !rightSection) return;

    const handleLeftScroll = () => {
      rightSection.scrollTop = leftSection.scrollTop;
    };

    const handleRightScroll = () => {
      leftSection.scrollTop = rightSection.scrollTop;
    };

    leftSection.addEventListener("scroll", handleLeftScroll);
    rightSection.addEventListener("scroll", handleRightScroll);

    return () => {
      leftSection.removeEventListener("scroll", handleLeftScroll);
      rightSection.removeEventListener("scroll", handleRightScroll);
    };
  }, []);

  // Mock data for demonstration
  const mockProjects = [
    {
      id: "1",
      name: "ICT Triển khai",
      key: "ICT",
      startDate: "2022-05-09",
      endDate: "2022-07-15",
      sprints: [
        {
          id: "s1",
          name: "Sprint 1",
          startDate: "2022-05-09",
          endDate: "2022-05-23",
          tasks: [
            { id: "t1", name: "Setup infrastructure", startDate: "2022-05-09", endDate: "2022-05-15" },
            { id: "t2", name: "Design database", startDate: "2022-05-16", endDate: "2022-05-23" },
          ],
        },
      ],
    },
    {
      id: "2",
      name: "ETL Triển khai",
      key: "ETL",
      startDate: "2022-09-04",
      endDate: "2022-09-08",
      sprints: [],
    },
  ];

  // Toggle expand/collapse
  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Handle group by change
  const handleGroupByChange = (value) => {
    setGroupBy((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  // Generate timeline columns based on view
  const generateTimelineColumns = () => {
    const columns = [];
    const startDate = new Date("2021-02-01");
    const endDate = new Date("2023-12-31");

    if (timeView === "weeks") {
      let current = new Date(startDate);
      let weekNum = 1;
      while (current <= endDate) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);

        columns.push({
          label: `W${weekNum}`,
          sublabel: `(${String(weekStart.getDate()).padStart(2, "0")} - ${String(weekEnd.getDate()).padStart(2, "0")})`,
          start: weekStart,
          end: weekEnd,
        });

        current.setDate(current.getDate() + 7);
        weekNum++;
      }
    } else if (timeView === "months") {
      let current = new Date(startDate);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      while (current <= endDate) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

        columns.push({
          label: monthNames[current.getMonth()],
          sublabel: current.getFullYear().toString(),
          start: monthStart,
          end: monthEnd,
        });

        // Move to next month
        current.setMonth(current.getMonth() + 1);
      }
    } else if (timeView === "years") {
      let currentYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();

      while (currentYear <= endYear) {
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);

        columns.push({
          label: currentYear.toString(),
          sublabel: "Year",
          start: yearStart,
          end: yearEnd,
        });

        currentYear++;
      }
    }

    return columns.slice(0, 200); // Limit for demo
  };

  const timelineColumns = generateTimelineColumns();

  // Calculate bar position and width
  const calculateBarPosition = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timelineStart = new Date(timelineColumns[0]?.start);
    const timelineEnd = new Date(timelineColumns[timelineColumns.length - 1]?.end);

    const totalDays = (timelineEnd - timelineStart) / (1000 * 60 * 60 * 24);
    const startOffset = (start - timelineStart) / (1000 * 60 * 60 * 24);
    const duration = (end - start) / (1000 * 60 * 60 * 24);

    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;

    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  return (
    <div className="gantt-page" data-timeview={timeView}>
      {/* Header */}
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

      {/* Gantt Chart */}
      <div className="gantt-container">
        {/* Left Section - Fixed */}
        <div className="gantt-left-section" ref={leftSectionRef}>
          {/* Header */}
          <div className="gantt-left-header">
            <span>Project</span>
          </div>

          {/* Body */}
          <div className="gantt-body">
            {mockProjects.map((project) => {
              const isExpanded = expandedItems.has(project.id);
              const hasSprints = groupBy.includes("sprint") && project.sprints?.length > 0;

              return (
                <React.Fragment key={project.id}>
                  {/* Project Row */}
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

                  {/* Sprint Rows */}
                  {isExpanded &&
                    hasSprints &&
                    project.sprints.map((sprint) => {
                      const isSprintExpanded = expandedItems.has(sprint.id);
                      const hasTasks = groupBy.includes("task") && sprint.tasks?.length > 0;

                      return (
                        <React.Fragment key={sprint.id}>
                          <div className="gantt-row gantt-row-sprint">
                            <div className="gantt-left">
                              <div className="gantt-item-info gantt-item-nested">
                                {hasTasks && (
                                  <button className="gantt-expand-btn" onClick={() => toggleExpand(sprint.id)}>
                                    <span className="material-symbols-outlined">{isSprintExpanded ? "expand_more" : "chevron_right"}</span>
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

                          {/* Task Rows */}
                          {isSprintExpanded &&
                            hasTasks &&
                            sprint.tasks.map((task) => (
                              <div key={task.id} className="gantt-row gantt-row-task">
                                <div className="gantt-left">
                                  <div className="gantt-item-info gantt-item-nested-2">
                                    <div style={{ width: "24px" }} />
                                    <div className="gantt-item-icon task-icon">
                                      <span className="material-symbols-outlined">task</span>
                                    </div>
                                    <span className="gantt-item-name">{task.name}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Right Section - Scrollable */}
        <div className="gantt-right-section" ref={rightSectionRef}>
          <div className="gantt-wrapper">
            {/* Header */}
            <div className="gantt-right-header">
              <div className="gantt-timeline-header">
                {timelineColumns.map((col, idx) => (
                  <div key={idx} className="gantt-timeline-col">
                    <div className="gantt-timeline-label">{col.label}</div>
                    <div className="gantt-timeline-sublabel">{col.sublabel}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="gantt-body">
              {mockProjects.map((project) => {
                const isExpanded = expandedItems.has(project.id);
                const hasSprints = groupBy.includes("sprint") && project.sprints?.length > 0;
                const barStyle = calculateBarPosition(project.startDate, project.endDate);

                return (
                  <React.Fragment key={project.id}>
                    {/* Project Row */}
                    <div className="gantt-row gantt-row-project">
                      <div className="gantt-right">
                        <div className="gantt-timeline">
                          <div className="gantt-bar gantt-bar-project" style={barStyle} title={`${project.startDate} - ${project.endDate}`}>
                            <span className="gantt-bar-label">{project.key}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sprint Rows */}
                    {isExpanded &&
                      hasSprints &&
                      project.sprints.map((sprint) => {
                        const isSprintExpanded = expandedItems.has(sprint.id);
                        const hasTasks = groupBy.includes("task") && sprint.tasks?.length > 0;
                        const sprintBarStyle = calculateBarPosition(sprint.startDate, sprint.endDate);

                        return (
                          <React.Fragment key={sprint.id}>
                            <div className="gantt-row gantt-row-sprint">
                              <div className="gantt-right">
                                <div className="gantt-timeline">
                                  <div
                                    className="gantt-bar gantt-bar-sprint"
                                    style={sprintBarStyle}
                                    title={`${sprint.startDate} - ${sprint.endDate}`}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Task Rows */}
                            {isSprintExpanded &&
                              hasTasks &&
                              sprint.tasks.map((task) => {
                                const taskBarStyle = calculateBarPosition(task.startDate, task.endDate);
                                return (
                                  <div key={task.id} className="gantt-row gantt-row-task">
                                    <div className="gantt-right">
                                      <div className="gantt-timeline">
                                        <div className="gantt-bar gantt-bar-task" style={taskBarStyle} title={`${task.startDate} - ${task.endDate}`}>
                                          <span className="gantt-bar-label">{task.name}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttPage;
