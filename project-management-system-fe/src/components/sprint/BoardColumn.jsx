import React from "react";
import { useDrop } from "react-dnd";
import TaskCard from "./TaskCard";
import { isTransitionAllowed } from "../../utils/workflowTransitions";

// Column Component with Drop functionality
const BoardColumn = ({ status, tasks, onDrop, workflow }) => {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: "task",
      drop: (item) => onDrop(item, status),
      canDrop: (item) => {
        // Check if transition is allowed by workflow
        if (!workflow || !item.task?.statusId) return true;
        return isTransitionAllowed(workflow, item.task.statusId._id, status._id);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [status, workflow]
  );

  const getCategoryLabel = () => {
    switch (status.category) {
      case "To Do":
        return "TO DO";
      case "In Progress":
        return "IN PROGRESS";
      case "Done":
        return "DONE";
      default:
        return status.name.toUpperCase();
    }
  };

  const getCategoryClass = () => {
    switch (status.category) {
      case "To Do":
        return "todo";
      case "In Progress":
        return "inprogress";
      case "Done":
        return "done";
      default:
        return status.name.toLowerCase().replace(" ", "");
    }
  };

  return (
    <div className="board-column" ref={drop}>
      <div className={`board-column-header board-column-header-${getCategoryClass()}`}>
        {getCategoryLabel()}
        <span className="board-column-count">({tasks.length})</span>
      </div>
      <div
        className={`board-column-body ${isOver && canDrop ? "drop-over" : ""} ${isOver && !canDrop ? "drop-not-allowed" : ""}`}
        style={{ minHeight: "400px" }}
      >
        {isOver && !canDrop && (
          <div className="drop-blocked-indicator">
            <span className="material-symbols-outlined">block</span>
            <span>Transition not allowed</span>
          </div>
        )}
        {tasks.length === 0 ? (
          <div className="board-column-empty">Drop tasks here</div>
        ) : (
          tasks.map((task) => <TaskCard key={task._id} task={task} />)
        )}
      </div>
    </div>
  );
};

export default BoardColumn;
