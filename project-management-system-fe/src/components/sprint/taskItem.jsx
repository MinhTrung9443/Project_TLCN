import { useDrag, useDrop } from "react-dnd";
import "../../styles/pages/ManageSprint/taskItem.css";
import { IconComponent } from "../../components/common/IconPicker";

// Draggable Task Item
const DraggableTask = ({ task, source, canDragDrop }) => {
  const PREDEFINED_PRIORITY_ICONS = [
    { name: "FaExclamationCircle", color: "#CD1317" }, // Critical
    { name: "FaArrowUp", color: "#F57C00" }, // High
    { name: "FaEquals", color: "#2A9D8F" }, // Medium
    { name: "FaArrowDown", color: "#2196F3" }, // Low
    { name: "FaFire", color: "#E94F37" },
    { name: "FaExclamationTriangle", color: "#FFB300" },
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

  return (
    <div ref={drag} className={`task-item${isDragging ? " task-item-dragging" : ""}`}>
      <div className="task-item-left">
        <div
          className={`task-status-icon ${task.isBug ? "task-status-bug" : task.isChecked ? "task-status-done" : "task-status-normal"}`}
          title={task.isBug ? "Bug" : task.isChecked ? "Done" : "Task"}
        >
          {task.isBug ? (
            <span className="material-symbols-outlined task-icon-bug">bug_report</span>
          ) : task.isChecked ? (
            <span className="material-symbols-outlined task-icon-done">check_circle</span>
          ) : (
            <span className="material-symbols-outlined task-icon-normal">task_alt</span>
          )}
        </div>
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
        <div className="task-assignee" title="Assignee">
          {task.assigneeId && task.assigneeId.avatar ? (
            <img src={task.assigneeId.avatar} alt="avatar" className="task-assignee-avatar" />
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
const TaskList = ({ tasks, source, onDrop, canDragDrop = true }) => {
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
        tasks.map((task, index) => <DraggableTask key={task.id || index} task={task} source={source} canDragDrop={canDragDrop} />)
      ) : (
        <div className="task-empty">No tasks</div>
      )}
    </div>
  );
};

export default TaskList;
