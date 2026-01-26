import React from "react";
import GanttTimeline from "./GanttTimeline";
import GanttProjectBar from "./GanttProjectBar";
import GanttSprintBar from "./GanttSprintBar";
import GanttTaskBar from "./GanttTaskBar";

const GanttRightSection = ({ projects, groupBy, expandedItems, timelineColumns, calculateBarPosition, rightSectionRef }) => {
  // Safety check
  if (!Array.isArray(projects)) {
    return (
      <div className="flex-1 overflow-x-auto" ref={rightSectionRef}>
        <div className="inline-block min-w-full">
          <GanttTimeline timelineColumns={timelineColumns} />
          <div className="flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-2 p-6">
              <span className="material-symbols-outlined text-slate-400 text-3xl">schedule</span>
              <p className="text-sm text-slate-500">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate wrapper width based on number of columns and column width
  // Each column has different width based on timeView
  const getColumnWidth = () => {
    // This should match the CSS values
    const timeViewElement = document.querySelector(".gantt-page");
    const timeView = timeViewElement?.getAttribute("data-timeview") || "weeks";

    switch (timeView) {
      case "months":
        return 100;
      case "years":
        return 120;
      default:
        return 120; // weeks - increased from 80px to 120px
    }
  };

  const columnWidth = getColumnWidth();
  const totalWidth = timelineColumns.length * columnWidth;
  const wrapperStyle = {
    minWidth: `${totalWidth}px`,
    width: `${totalWidth}px`,
  };

  // Determine what type of data we're displaying
  const hasProject = groupBy.includes("project");
  const hasSprint = groupBy.includes("sprint");
  const hasTask = groupBy.includes("task");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header - fixed, doesn't scroll */}
      <GanttTimeline timelineColumns={timelineColumns} />

      {/* Body - scrollable both directions */}
      <div className="flex-1 overflow-x-auto overflow-y-auto" ref={rightSectionRef}>
        <div className="inline-block min-w-full" style={wrapperStyle}>
          {/* Body */}
          <div className="bg-white">
            {projects.map((item) => {
              // If displaying projects
              if (hasProject) {
                const project = item;
                const isExpanded = expandedItems.has(project.id);
                const hasSprints = hasSprint && project.sprints?.length > 0;
                const hasTasks = hasTask && project.tasks?.length > 0;
                const barStyle = calculateBarPosition(project.startDate, project.endDate);

                return (
                  <React.Fragment key={project.id}>
                    {/* Project Bar */}
                    <GanttProjectBar project={project} barStyle={barStyle} />

                    {isExpanded && (
                      <>
                        {/* Sprint Bars (when groupBy includes sprint) */}
                        {hasSprints &&
                          project.sprints.map((sprint) => {
                            const isSprintExpanded = expandedItems.has(sprint.id);
                            const hasSprintTasks = hasTask && sprint.tasks?.length > 0;
                            const sprintBarStyle = calculateBarPosition(sprint.startDate, sprint.endDate);

                            return (
                              <React.Fragment key={sprint.id}>
                                <GanttSprintBar sprint={sprint} barStyle={sprintBarStyle} />

                                {/* Task Bars under Sprint */}
                                {isSprintExpanded &&
                                  hasSprintTasks &&
                                  sprint.tasks.map((task) => {
                                    const taskBarStyle = calculateBarPosition(task.startDate, task.dueDate);
                                    return <GanttTaskBar key={task.id} task={task} barStyle={taskBarStyle} />;
                                  })}
                              </React.Fragment>
                            );
                          })}

                        {/* Task Bars directly under Project (when groupBy has task but not sprint) */}
                        {hasTasks &&
                          !hasSprint &&
                          project.tasks.map((task) => {
                            const taskBarStyle = calculateBarPosition(task.startDate, task.dueDate);
                            return <GanttTaskBar key={task.id} task={task} barStyle={taskBarStyle} />;
                          })}
                      </>
                    )}
                  </React.Fragment>
                );
              }

              // If displaying sprints (no project)
              else if (hasSprint) {
                const sprint = item;
                const isExpanded = expandedItems.has(sprint.id);
                const hasSprintTasks = hasTask && sprint.tasks?.length > 0;
                const sprintBarStyle = calculateBarPosition(sprint.startDate, sprint.endDate);

                return (
                  <React.Fragment key={sprint.id}>
                    <GanttSprintBar sprint={sprint} barStyle={sprintBarStyle} />

                    {/* Task Bars under Sprint */}
                    {isExpanded &&
                      hasSprintTasks &&
                      sprint.tasks.map((task) => {
                        const taskBarStyle = calculateBarPosition(task.startDate, task.dueDate);
                        return <GanttTaskBar key={task.id} task={task} barStyle={taskBarStyle} />;
                      })}
                  </React.Fragment>
                );
              }

              // If displaying tasks only (no project, no sprint)
              else if (hasTask) {
                const task = item;
                const taskBarStyle = calculateBarPosition(task.startDate, task.dueDate);
                return <GanttTaskBar key={task.id} task={task} barStyle={taskBarStyle} />;
              }

              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttRightSection;
