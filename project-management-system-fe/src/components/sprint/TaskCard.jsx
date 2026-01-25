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
    navigate(`/app/task/${task.key}`);
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
      className={`bg-white rounded-lg p-4 mb-3 border border-gray-200 shadow-sm hover:shadow-md transition-all ${isDragging ? "opacity-50" : ""}`}
      style={{ opacity: isDragging ? 0.5 : 1, cursor: "pointer" }}
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="material-symbols-outlined text-gray-400 text-lg">check_box</span>
        <span className="text-sm font-semibold text-purple-600">{task.key}</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-6 h-6 rounded flex items-center justify-center text-white text-sm"
          style={{ backgroundColor: typeIcon.color }}
          title={task.taskTypeId?.name}
        >
          <IconComponent name={typeIcon.name} />
        </span>
        <span className="text-xs text-gray-600">{task.taskTypeId?.name || "Task"}</span>
      </div>

      <div className="text-sm font-medium text-gray-900 mb-4 line-clamp-2">{task.name}</div>

      <div className="flex items-center justify-between">
        <span
          className="w-6 h-6 rounded flex items-center justify-center text-white text-sm"
          style={{ backgroundColor: priorityIcon.color }}
          title={task.priorityId?.name}
        >
          <IconComponent name={priorityIcon.name} />
        </span>
        <div className="flex items-center">
          {task.assigneeId ? (
            <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center" title={task.assigneeId.fullname}>
              {task.assigneeId.avatar ? (
                <img src={task.assigneeId.avatar} alt={task.assigneeId.fullname} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-sm font-semibold">{task.assigneeId.fullname.charAt(0).toUpperCase()}</span>
              )}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center" title="Unassigned">
              <span className="material-symbols-outlined text-gray-600 text-lg">person</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
