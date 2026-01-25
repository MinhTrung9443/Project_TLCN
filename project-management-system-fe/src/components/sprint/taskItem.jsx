import { useDrag, useDrop } from "react-dnd";
import { IconComponent } from "../../components/common/IconPicker";

// Utility function to truncate text
const truncateText = (text, maxLength = 40) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

// Draggable Task Item
const DraggableTask = ({ task, source, canDragDrop, onTaskClick }) => {
  const PREDEFINED_PRIORITY_ICONS = [
    { name: "FaExclamationCircle", color: "#CD1317" }, // Critical
    { name: "FaArrowUp", color: "#F57C00" }, // High
    { name: "FaEquals", color: "#2A9D8F" }, // Medium
    { name: "FaArrowDown", color: "#2196F3" }, // Low
    { name: "FaFire", color: "#E94F37" },
    { name: "FaExclamationTriangle", color: "#FFB300" },
  ];
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
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "task",
      item: { task, source },
      canDrag: () => canDragDrop,
      log: console.log(`Dragging task: ${task.name}`, source),
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [task, source, canDragDrop],
  );
  const typeIconInfo = PREDEFINED_TASKTYPE_ICONS.find((i) => i.name === task.taskTypeId?.icon);

  return (
    <div
      ref={drag}
      className={`flex items-center justify-between p-3 mb-2 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer ${isDragging ? "opacity-50" : ""}`}
      onClick={() => onTaskClick && onTaskClick(task)}
      style={{ cursor: "pointer" }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {typeIconInfo ? (
          <span
            className="w-6 h-6 rounded flex items-center justify-center text-white text-sm flex-shrink-0"
            style={{ backgroundColor: typeIconInfo.color }}
            title={task.taskTypeId?.name}
          >
            <IconComponent name={task.taskTypeId.icon} />
          </span>
        ) : (
          <span className="w-6 h-6 rounded flex items-center justify-center text-white text-sm flex-shrink-0" style={{ backgroundColor: "#ccc" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
              help
            </span>
          </span>
        )}

        <span className="text-sm font-semibold text-purple-600 flex-shrink-0">{task.key || "No-Key"}</span>
        <span className="text-sm text-gray-900 truncate" title={task.name}>
          {truncateText(task.name, 40)}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Priority Icon (same style as TaskFinder) */}
        <div className="flex items-center" title={task.priorityId?.name || "Priority"}>
          {(() => {
            if (!task.priorityId?.icon) return null;
            const iconInfo = PREDEFINED_PRIORITY_ICONS.find((i) => i.name === task.priorityId.icon);
            return (
              <span
                className="w-6 h-6 rounded flex items-center justify-center text-white text-sm"
                style={{ backgroundColor: iconInfo ? iconInfo.color : "#ccc" }}
              >
                <IconComponent name={task.priorityId.icon} />
              </span>
            );
          })()}
        </div>
        {/* Status Icon */}
        <div className="flex items-center" title={task.statusId?.name || "Status"}>
          {task.statusId?.name === "To Do" && <span className="material-symbols-outlined text-gray-400">radio_button_unchecked</span>}
          {task.statusId?.name === "In Progress" && <span className="material-symbols-outlined text-blue-500">schedule</span>}
          {task.statusId?.name === "Done" && <span className="material-symbols-outlined text-green-500">check_circle</span>}
        </div>
        {/* Assignee Avatar */}
        <div className="flex items-center" title={task.assigneeId ? task.assigneeId.fullname || task.assigneeId.username : "Unassigned"}>
          {task.assigneeId ? (
            task.assigneeId.avatar ? (
              <img src={task.assigneeId.avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-semibold">
                {(task.assigneeId.fullname || task.assigneeId.username || "U").charAt(0).toUpperCase()}
              </div>
            )
          ) : (
            <span className="material-symbols-outlined text-gray-400 text-xl">person</span>
          )}
        </div>
      </div>
    </div>
  );
};

// DropZone for Task List (Backlog hoặc Sprint)
const TaskList = ({ tasks, source, onDrop, canDragDrop = true, onTaskClick }) => {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: "task",
      canDrop: () => canDragDrop,
      drop: (item) => {
        if (item.source !== source) onDrop(item, source);
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [onDrop, source, canDragDrop],
  );

  return (
    <div ref={drop} className={`min-h-[100px] p-2 rounded-lg ${isOver ? "bg-purple-50 border-2 border-purple-300" : ""}`}>
      {tasks && tasks.length > 0 ? (
        tasks.map((task, index) => (
          <DraggableTask key={task.id || index} task={task} source={source} canDragDrop={canDragDrop} onTaskClick={onTaskClick} />
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">No tasks</div>
      )}
    </div>
  );
};

export default TaskList;
