import React from "react";
import GanttProjectRow from "./GanttProjectRow";
import GanttSprintRow from "./GanttSprintRow";
import GanttTaskRow from "./GanttTaskRow";

const GanttLeftSection = ({ projects, backlogTasks = [], groupBy, expandedItems, toggleExpand, leftSectionRef }) => {
  // Safety check
  if (!Array.isArray(projects)) {
    return (
      <div className="gantt-left-section" ref={leftSectionRef}>
        <div className="gantt-left-header">
          <span>Name</span>
        </div>
        <div className="gantt-body">
          <div style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Determine what type of data we're displaying
  const hasProject = groupBy.includes("project");
  const hasSprint = groupBy.includes("sprint");
  const hasTask = groupBy.includes("task");

  return (
    <div className="gantt-left-section" ref={leftSectionRef}>
      {/* Header */}
      <div className="gantt-left-header">
        <span>{hasProject ? "Project" : hasSprint ? "Sprint" : "Task"}</span>
      </div>

      {/* Body */}
      <div className="gantt-body">
        {projects.map((item) => {
          // If displaying projects
          if (hasProject) {
            const project = item;
            const isExpanded = expandedItems.has(project.id);
            const hasSprints = hasSprint && project.sprints?.length > 0;
            const hasTasks = hasTask && project.tasks?.length > 0;
            const hasBacklogTasks = hasTask && project.backlogTasks?.length > 0;

            return (
              <React.Fragment key={project.id}>
                {/* Project Row */}
                <GanttProjectRow
                  project={project}
                  isExpanded={isExpanded}
                  hasSprints={hasSprints || hasTasks || hasBacklogTasks}
                  toggleExpand={toggleExpand}
                />

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

                    {/* Backlog Tasks (tasks without sprint) */}
                    {hasBacklogTasks && hasSprint && project.backlogTasks.map((task) => <GanttTaskRow key={task.id} task={task} />)}

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

        {/* Backlog Tasks at the end (for sprint-task groupby without project) */}
        {!hasProject && hasSprint && hasTask && backlogTasks.length > 0 && (
          <>
            {backlogTasks.map((task) => (
              <GanttTaskRow key={task.id} task={task} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default GanttLeftSection;
