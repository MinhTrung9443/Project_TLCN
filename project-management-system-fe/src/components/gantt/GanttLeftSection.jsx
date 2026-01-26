import React from "react";
import GanttProjectRow from "./GanttProjectRow";
import GanttSprintRow from "./GanttSprintRow";
import GanttTaskRow from "./GanttTaskRow";

const GanttLeftSection = ({ projects, groupBy, expandedItems, toggleExpand, leftSectionRef }) => {
  // Safety check
  if (!Array.isArray(projects)) {
    return (
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
        <div className="flex h-14 items-center border-b border-slate-200 bg-slate-50 px-4 font-semibold text-slate-900 flex-shrink-0">
          <span>Name</span>
        </div>
        <div className="flex items-center justify-center bg-white p-6 flex-1 overflow-y-auto" ref={leftSectionRef}>
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-3xl">schedule</span>
            <p className="text-sm text-slate-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine what type of data we're displaying
  const hasProject = groupBy.includes("project");
  const hasSprint = groupBy.includes("sprint");
  const hasTask = groupBy.includes("task");

  return (
    <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
      {/* Header */}
      <div className="flex h-14 items-center border-b border-slate-200 bg-slate-50 px-4 font-semibold text-slate-900 flex-shrink-0">
        <span>{hasProject ? "Project" : hasSprint ? "Sprint" : "Task"}</span>
      </div>

      {/* Body */}
      <div className="bg-white divide-y divide-slate-100 overflow-y-auto flex-1" ref={leftSectionRef}>
        {projects.map((item) => {
          // If displaying projects
          if (hasProject) {
            const project = item;
            const isExpanded = expandedItems.has(project.id);
            const hasSprints = hasSprint && project.sprints?.length > 0;
            const hasTasks = hasTask && project.tasks?.length > 0;

            return (
              <React.Fragment key={project.id}>
                {/* Project Row */}
                <GanttProjectRow project={project} isExpanded={isExpanded} hasSprints={hasSprints || hasTasks} toggleExpand={toggleExpand} />

                {isExpanded && (
                  <>
                    {/* Sprint Rows (when groupBy includes sprint) */}
                    {hasSprints &&
                      project.sprints.map((sprint) => {
                        const isSprintExpanded = expandedItems.has(sprint.id);
                        const hasSprintTasks = hasTask && sprint.tasks?.length > 0;

                        return (
                          <React.Fragment key={sprint.id}>
                            <GanttSprintRow sprint={sprint} isExpanded={isSprintExpanded} hasTasks={hasSprintTasks} toggleExpand={toggleExpand} />

                            {/* Task Rows under Sprint */}
                            {isSprintExpanded && hasSprintTasks && sprint.tasks.map((task) => <GanttTaskRow key={task.id} task={task} />)}
                          </React.Fragment>
                        );
                      })}

                    {/* Task Rows directly under Project (when groupBy has task but not sprint) */}
                    {hasTasks && !hasSprint && project.tasks.map((task) => <GanttTaskRow key={task.id} task={task} />)}
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

            return (
              <React.Fragment key={sprint.id}>
                <GanttSprintRow sprint={sprint} isExpanded={isExpanded} hasTasks={hasSprintTasks} toggleExpand={toggleExpand} />

                {/* Task Rows under Sprint */}
                {isExpanded && hasSprintTasks && sprint.tasks.map((task) => <GanttTaskRow key={task.id} task={task} />)}
              </React.Fragment>
            );
          }

          // If displaying tasks only (no project, no sprint)
          else if (hasTask) {
            const task = item;
            return <GanttTaskRow key={task.id} task={task} />;
          }

          return null;
        })}
      </div>
    </div>
  );
};

export default GanttLeftSection;
