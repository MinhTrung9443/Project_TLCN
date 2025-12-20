import { useDrag, useDrop } from "react-dnd";
import "../../styles/pages/ManageSprint/taskItem.css";
import { IconComponent } from "../../components/common/IconPicker";

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
    [task, source, canDragDrop]
  );
  const typeIconInfo = PREDEFINED_TASKTYPE_ICONS.find((i) => i.name === task.taskTypeId?.icon);

  return (
    <div
      ref={drag}
      className={`task-item${isDragging ? " task-item-dragging" : ""}`}
      onClick={() => onTaskClick && onTaskClick(task)}
      style={{ cursor: "pointer" }}
    >
      <div className="task-item-left">
        {typeIconInfo ? (
          <span className="icon-wrapper-list-small" style={{ backgroundColor: typeIconInfo.color }} title={task.taskTypeId?.name}>
            <IconComponent name={task.taskTypeId.icon} />
          </span>
        ) : (
          <span className="icon-wrapper-list-small" style={{ backgroundColor: "#ccc" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
              help
            </span>
          </span>
        )}

        <span className="task-key-display">{task.key || "No-Key"}</span>
        <span className="task-name" title={task.name}>
          {task.name}
        </span>
      </div>
      <div className="task-item-right">
        {/* Priority Icon (same style as TaskFinder) */}
        <div className="task-priority" title={task.priorityId?.name || "Priority"}>
          {(() => {
            if (!task.priorityId?.icon) return null;
            const iconInfo = PREDEFINED_PRIORITY_ICONS.find((i) => i.name === task.priorityId.icon);
            return (
              <span className="icon-wrapper-list" style={{ backgroundColor: iconInfo ? iconInfo.color : "#ccc" }}>
                <IconComponent name={task.priorityId.icon} />
              </span>
            );
          })()}
        </div>
        {/* Status Icon */}
        <div className="task-status-type" title={task.statusId?.name || "Status"}>
          {task.statusId?.name === "To Do" && <span className="material-symbols-outlined task-status-todo">radio_button_unchecked</span>}
          {task.statusId?.name === "In Progress" && <span className="material-symbols-outlined task-status-inprogress">schedule</span>}
          {task.statusId?.name === "Done" && <span className="material-symbols-outlined task-status-done">check_circle</span>}
        </div>
        {/* Assignee Avatar */}
        <div className="task-assignee" title={task.assigneeId ? task.assigneeId.fullname || task.assigneeId.username : "Unassigned"}>
          {task.assigneeId ? (
            task.assigneeId.avatar ? (
              <img src={task.assigneeId.avatar} alt="avatar" className="task-assignee-avatar" />
            ) : (
              <div className="task-assignee-avatar-placeholder">
                {(task.assigneeId.fullname || task.assigneeId.username || "U").charAt(0).toUpperCase()}
              </div>
            )
          ) : (
            <span className="material-symbols-outlined task-assignee-icon">person</span>
          )}
        </div>
        {/* Due Date/Days Left - Redesigned for alignment and color */}
        <div className="task-duedate" title="Due Date">
          {(() => {
            if (!task.dueDate) return <span className="task-due-label">-</span>;
            const due = new Date(task.dueDate);
            const now = new Date();
            const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
            if (diff < 0) {
              return <span className="task-due-number task-due-overdue">{Math.abs(diff)}d</span>;
            } else {
              return <span className="task-due-number task-due-left">{diff}d</span>;
            }
          })()}
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
    [onDrop, source, canDragDrop]
  );

  return (
    <div ref={drop} className={`task-list${isOver ? " task-list-over" : ""}`}>
      {tasks && tasks.length > 0 ? (
        tasks.map((task, index) => (
          <DraggableTask key={task.id || index} task={task} source={source} canDragDrop={canDragDrop} onTaskClick={onTaskClick} />
        ))
      ) : (
        <div className="task-empty">No tasks</div>
      )}
    </div>
  );
};

export default TaskList;
