import React from "react";
import { useDrag } from "react-dnd";
import { useNavigate, useParams } from "react-router-dom";

const PREDEFINED_TASKTYPE_ICONS = [
  { name: "task", color: "#4BADE8" },
  { name: "star", color: "#F6C343" },
  { name: "bolt", color: "#E97444" },
  { name: "check_circle", color: "#4ADE80" },
  { name: "calendar_month", color: "#8B5CF6" },
  { name: "bug_report", color: "#EF4444" },
];

const PREDEFINED_PRIORITY_ICONS = [
  { name: "task", color: "#4BADE8" },
  { name: "star", color: "#F6C343" },
  { name: "bolt", color: "#E97444" },
  { name: "check_circle", color: "#4ADE80" },
  { name: "calendar_month", color: "#8B5CF6" },
  { name: "bug_report", color: "#EF4444" },
];

const IconComponent = ({ name }) => <span className="material-symbols-outlined">{name}</span>;

// Task Card Component with Drag functionality
const TaskCard = ({ task, onStatusChange }) => {
  const navigate = useNavigate();
  const { projectKey } = useParams();

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "task",
    item: { task },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleCardClick = (e) => {
    // Prevent navigation when dragging
    if (isDragging) return;
    navigate(`/task/${task.key}`);
  };

  const getTypeIcon = () => {
    const typeInfo = PREDEFINED_TASKTYPE_ICONS.find((i) => i.name === task.taskTypeId?.icon);
    return typeInfo || { name: "task", color: "#4BADE8" };
  };

  const getPriorityIcon = () => {
    const priorityInfo = PREDEFINED_PRIORITY_ICONS.find((i) => i.name === task.priorityId?.icon);
    return priorityInfo || { name: "task", color: "#4BADE8" };
  };

  const typeIcon = getTypeIcon();
  const priorityIcon = getPriorityIcon();

  return (
    <div
      ref={drag}
      className={`board-task-card ${isDragging ? "dragging" : ""}`}
      style={{ opacity: isDragging ? 0.5 : 1, cursor: "pointer" }}
      onClick={handleCardClick}
    >
      <div className="board-task-top">
        <span className="board-task-checkbox material-symbols-outlined">check_box</span>
        <span className="board-task-code">{task.key}</span>
      </div>

      <div className="board-task-type-row">
        <span className="icon-wrapper-task" style={{ backgroundColor: typeIcon.color }} title={task.taskTypeId?.name}>
          <IconComponent name={typeIcon.name} />
        </span>
        <span className="board-task-type-name">{task.taskTypeId?.name || "Task"}</span>
      </div>

      <div className="board-task-name">{task.name}</div>

      <div className="board-task-footer">
        <span className="icon-wrapper-priority" style={{ backgroundColor: priorityIcon.color }} title={task.priorityId?.name}>
          <IconComponent name={priorityIcon.name} />
        </span>
        <div className="board-task-assignee">
          {task.assigneeId ? (
            <div className="avatar" title={task.assigneeId.fullname}>
              {task.assigneeId.avatar ? (
                <img src={task.assigneeId.avatar} alt={task.assigneeId.fullname} />
              ) : (
                <span>{task.assigneeId.fullname.charAt(0).toUpperCase()}</span>
              )}
            </div>
          ) : (
            <div className="avatar unassigned" title="Unassigned">
              <span className="material-symbols-outlined">person</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
