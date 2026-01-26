import React from "react";
import { FaUserCircle } from "react-icons/fa";
import { IconComponent } from "../../components/common/IconPicker";
import { TableRow, TableCell } from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";

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

const statusCategoryStyles = {
  "To Do": "bg-neutral-100 text-neutral-700 border-neutral-200",
  "In Progress": "bg-primary-100 text-primary-700 border-primary-200",
  Done: "bg-success-100 text-success-700 border-success-200",
  default: "bg-neutral-100 text-neutral-700 border-neutral-200",
};

const Avatar = ({ user }) => {
  if (!user) {
    return (
      <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center text-lg">
        <FaUserCircle />
      </div>
    );
  }

  if (user.avatar) {
    return <img src={user.avatar} alt={user.fullname} className="w-9 h-9 rounded-full object-cover" title={user.fullname} />;
  }

  return (
    <div
      className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold"
      title={user.fullname}
    >
      {user.fullname?.charAt(0)?.toUpperCase()}
    </div>
  );
};

const TaskRow = ({ task, onTaskClick }) => {
  const typeIconInfo = PREDEFINED_TASKTYPE_ICONS.find((i) => i.name === task.taskTypeId?.icon);
  const platformIconInfo = PREDEFINED_PLATFORM_ICONS.find((i) => i.name === task.platformId?.icon);
  const priorityIconInfo = PREDEFINED_PRIORITY_ICONS.find((i) => i.name === task.priorityId?.icon);
  const statusClass = statusCategoryStyles[task.statusId?.category] || statusCategoryStyles.default;

  return (
    <TableRow onClick={() => onTaskClick(task)}>
      <TableCell className="whitespace-nowrap font-semibold text-primary-700">
        <div className="flex items-center gap-2">
          {typeIconInfo && (
            <span
              className="w-8 h-8 rounded-md text-white flex items-center justify-center text-base"
              style={{ backgroundColor: typeIconInfo.color }}
              title={task.taskTypeId.name}
            >
              <IconComponent name={task.taskTypeId.icon} />
            </span>
          )}
          <a href={`/task/${task.key}`} target="_blank" rel="noopener noreferrer" className="hover:underline" onClick={(e) => e.stopPropagation()}>
            {task.key}
          </a>
        </div>
      </TableCell>

      <TableCell className="max-w-xs">
        <p className="text-neutral-900 font-medium truncate" title={task.name}>
          {task.name}
        </p>
      </TableCell>

      <TableCell>
        <Badge variant="neutral" size="sm" className="text-[13px]">
          {task.sprintId?.name || "Backlog"}
        </Badge>
      </TableCell>

      <TableCell>
        {platformIconInfo && (
          <span
            className="w-9 h-9 rounded-lg text-white flex items-center justify-center text-lg"
            style={{ backgroundColor: platformIconInfo.color }}
            title={task.platformId.name}
          >
            <IconComponent name={task.platformId.icon} />
          </span>
        )}
      </TableCell>

      <TableCell>
        <Avatar user={task.assigneeId} />
      </TableCell>

      <TableCell>
        <Avatar user={task.reporterId} />
      </TableCell>

      <TableCell>
        {priorityIconInfo && (
          <span
            className="w-9 h-9 rounded-lg text-white flex items-center justify-center text-lg"
            style={{ backgroundColor: priorityIconInfo.color }}
            title={task.priorityId.name}
          >
            <IconComponent name={task.priorityId.icon} />
          </span>
        )}
      </TableCell>

      <TableCell>
        {task.statusId ? (
          <Badge variant="neutral" size="sm" className={`${statusClass} border`}>
            {task.statusId.name}
          </Badge>
        ) : (
          <span className="text-neutral-400">-</span>
        )}
      </TableCell>

      <TableCell className="whitespace-nowrap text-neutral-700">
        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : <span className="text-neutral-400">-</span>}
      </TableCell>
    </TableRow>
  );
};

export default TaskRow;
