import React from "react";
import GanttTimeline from "./GanttTimeline";
import GanttProjectBar from "./GanttProjectBar";
import GanttSprintBar from "./GanttSprintBar";
import GanttTaskBar from "./GanttTaskBar";

const GanttRightSection = ({ projects, groupBy, expandedItems, timelineColumns, calculateBarPosition, rightSectionRef }) => {
  // Safety check
  if (!Array.isArray(projects)) {
    return (
      <div className="gantt-right-section" ref={rightSectionRef}>
        <div className="gantt-wrapper">
          <GanttTimeline timelineColumns={timelineColumns} />
          <div className="gantt-body">
            <div style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-right-section" ref={rightSectionRef}>
      <div className="gantt-wrapper">
        {/* Header */}
        <GanttTimeline timelineColumns={timelineColumns} />

        {/* Body */}
        <div className="gantt-body">
          {projects.map((project) => {
            const isExpanded = expandedItems.has(project.id);
            const hasSprints = groupBy.includes("sprint") && project.sprints?.length > 0;
            const barStyle = calculateBarPosition(project.startDate, project.endDate);

            return (
              <React.Fragment key={project.id}>
                {/* Project Bar */}
                <GanttProjectBar project={project} barStyle={barStyle} />

                {/* Sprint Bars */}
                {isExpanded &&
                  hasSprints &&
                  project.sprints.map((sprint) => {
                    const isSprintExpanded = expandedItems.has(sprint.id);
                    const hasTasks = groupBy.includes("task") && sprint.tasks?.length > 0;
                    const sprintBarStyle = calculateBarPosition(sprint.startDate, sprint.endDate);

                    return (
                      <React.Fragment key={sprint.id}>
                        <GanttSprintBar sprint={sprint} barStyle={sprintBarStyle} />

                        {/* Task Bars */}
                        {isSprintExpanded &&
                          hasTasks &&
                          sprint.tasks.map((task) => {
                            const taskBarStyle = calculateBarPosition(task.startDate, task.endDate);
                            return <GanttTaskBar key={task.id} task={task} barStyle={taskBarStyle} />;
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
  );
};

export default GanttRightSection;
