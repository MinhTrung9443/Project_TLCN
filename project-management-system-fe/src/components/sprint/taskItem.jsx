import { useDrag, useDrop } from "react-dnd";
import "../../styles/pages/ManageSprint/taskItem.css";
// Draggable Task Item
const DraggableTask = ({ task, source }) => {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "task",
      item: { task, source },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [task, source]
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
        <span className="task-id">#{task.id}</span>
      </div>
      <div className="task-item-right">
        <div className="task-assignee" title="Assignee">
          {task.assignee && task.assignee.avatar ? (
            <img src={task.assignee.avatar} alt="avatar" className="task-assignee-avatar" />
          ) : (
            <span className="material-symbols-outlined task-assignee-icon">person</span>
          )}
        </div>
      </div>
    </div>
  );
};

// DropZone for Task List (Backlog hoặc Sprint)
export const TaskList = ({ tasks, source, onDrop }) => {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: "task",
      drop: (item) => {
        if (item.source !== source) onDrop(item, source);
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [onDrop, source]
  );

  return (
    <div ref={drop} className={`task-list${isOver ? " task-list-over" : ""}`}>
      {tasks && tasks.length > 0 ? (
        tasks.map((task, index) => <DraggableTask key={task.id || index} task={task} source={source} />)
      ) : (
        <div className="task-empty">No tasks</div>
      )}
    </div>
  );
};

export default TaskList;
