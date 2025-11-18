import React from "react";
import { FaUserCircle } from "react-icons/fa";
import { IconComponent } from "../../components/common/IconPicker";
import "../../styles/components/TaskRow.css";

// Các hằng số này thuộc về TaskRow, nên để ở đây
const PREDEFINED_TASKTYPE_ICONS = [
  { name: "FaTasks", color: "#4BADE8" },
  { name: "FaStar", color: "#2ECC71" },
  { name: "FaCheckSquare", color: "#5297FF" },
  { name: "FaRegWindowMaximize", color: "#00A8A2" },
  { name: "FaBug", color: "#E44D42" },
  { name: "FaArrowUp", color: "#F57C00" },
  { name: "FaBullseye", color: "#654DF7" },
  { name: "FaQuestionCircle", color: "#7A869A" },
  { name: "FaRegClone", color: "#4BADE8" },
  { name: "FaEquals", color: "#DE350B" },
  { name: "FaFileAlt", color: "#00B8D9" },
];
const PREDEFINED_PLATFORM_ICONS = [
  { name: "FaCode", color: "#8E44AD" },
  { name: "FaCog", color: "#E74C3C" },
  { name: "FaCubes", color: "#27AE60" },
  { name: "FaExpandArrowsAlt", color: "#3498DB" },
  { name: "FaApple", color: "#95A5A6" },
  { name: "FaAndroid", color: "#2ECC71" },
  { name: "FaChartBar", color: "#34495E" },
  { name: "FaTerminal", color: "#F1C40F" },
  { name: "FaPalette", color: "#9B59B6" },
  { name: "FaFlask", color: "#C0392B" },
];
const PREDEFINED_PRIORITY_ICONS = [
  { name: "FaFire", color: "#CD1317" },
  { name: "FaExclamationCircle", color: "#E94F37" },
  { name: "FaArrowUp", color: "#F4A261" },
  { name: "FaArrowAltCircleUp", color: "#F57C00" },
  { name: "FaEquals", color: "#2A9D8F" },
  { name: "FaPlusCircle", color: "#45B8AC" },
  { name: "FaMinusCircle", color: "#264653" },
  { name: "FaArrowDown", color: "#2196F3" },
  { name: "FaArrowAltCircleDown", color: "#03A9F4" },
  { name: "FaExclamationTriangle", color: "#FFB300" },
];

const TaskRow = ({ task, onTaskClick }) => {
  const renderAvatar = (user) => {
    if (!user)
      return (
        <div className="avatar default-avatar">
          <FaUserCircle />
        </div>
      );
    if (user.avatar) {
      return <img src={user.avatar} alt={user.fullname} className="avatar" title={user.fullname} />;
    }
    return (
      <div className="avatar default-avatar" title={user.fullname}>
        {user.fullname.charAt(0).toUpperCase()}
      </div>
    );
  };

  const typeIconInfo = PREDEFINED_TASKTYPE_ICONS.find((i) => i.name === task.taskTypeId?.icon);
  const platformIconInfo = PREDEFINED_PLATFORM_ICONS.find((i) => i.name === task.platformId?.icon);
  const priorityIconInfo = PREDEFINED_PRIORITY_ICONS.find((i) => i.name === task.priorityId?.icon);

  return (
    <div className="task-row" onClick={() => onTaskClick(task)}>
      <div className="task-cell task-key">
        {typeIconInfo && (
          <span className="icon-wrapper-list-small" style={{ backgroundColor: typeIconInfo.color }} title={task.taskTypeId.name}>
            <IconComponent name={task.taskTypeId.icon} />
          </span>
        )}
        <span>{task.key}</span>
      </div>
      <div className="task-cell task-name">{task.name}</div>
      <div className="task-cell task-sprint">
        <span className="sprint-pill">{task.sprintId?.name || "Backlog"}</span>
      </div>
      <div className="task-cell task-platform">
        {platformIconInfo && (
          <span className="icon-wrapper-list" style={{ backgroundColor: platformIconInfo.color }} title={task.platformId.name}>
            <IconComponent name={task.platformId.icon} />
          </span>
        )}
      </div>
      <div className="task-cell task-assignee">{renderAvatar(task.assigneeId)}</div>
      <div className="task-cell task-reporter">{renderAvatar(task.reporterId)}</div>
      <div className="task-cell task-priority">
        {priorityIconInfo && (
          <span className="icon-wrapper-list" style={{ backgroundColor: priorityIconInfo.color }} title={task.priorityId.name}>
            <IconComponent name={task.priorityId.icon} />
          </span>
        )}
      </div>
      <div className="task-cell task-status">
        <span className="status-pill" style={{ backgroundColor: task.statusId?.color || "#ccc" }}>
          {task.statusId?.name}
        </span>
      </div>
      <div className="task-cell task-due-date">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Due"}</div>
    </div>
  );
};

export default TaskRow;
