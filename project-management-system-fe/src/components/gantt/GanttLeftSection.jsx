import React from "react";
import GanttProjectRow from "./GanttProjectRow";
import GanttSprintRow from "./GanttSprintRow";
import GanttTaskRow from "./GanttTaskRow";

const GanttLeftSection = ({ projects, groupBy, expandedItems, toggleExpand, leftSectionRef }) => {
  return (
    <div className="gantt-left-section" ref={leftSectionRef}>
      {/* Header */}
      <div className="gantt-left-header">
        <span>Project</span>
      </div>

      {/* Body */}
      <div className="gantt-body">
        {projects.map((project) => {
          const isExpanded = expandedItems.has(project.id);
          const hasSprints = groupBy.includes("sprint") && project.sprints?.length > 0;

          return (
            <React.Fragment key={project.id}>
              {/* Project Row */}
              <GanttProjectRow project={project} isExpanded={isExpanded} hasSprints={hasSprints} toggleExpand={toggleExpand} />

              {/* Sprint Rows */}
              {isExpanded &&
                hasSprints &&
                project.sprints.map((sprint) => {
                  const isSprintExpanded = expandedItems.has(sprint.id);
                  const hasTasks = groupBy.includes("task") && sprint.tasks?.length > 0;

                  return (
                    <React.Fragment key={sprint.id}>
                      <GanttSprintRow sprint={sprint} isExpanded={isSprintExpanded} hasTasks={hasTasks} toggleExpand={toggleExpand} />

                      {/* Task Rows */}
                      {isSprintExpanded && hasTasks && sprint.tasks.map((task) => <GanttTaskRow key={task.id} task={task} />)}
                    </React.Fragment>
                  );
                })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default GanttLeftSection;
