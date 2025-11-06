import React from "react";
import { useDrop } from "react-dnd";
import TaskCard from "./TaskCard";

// Column Component with Drop functionality
const BoardColumn = ({ status, tasks, onDrop, onTaskMove }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "task",
    drop: (item) => onDrop(item, status),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

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
      <div className={`board-column-body ${isOver ? "drop-over" : ""}`} style={{ minHeight: "400px" }}>
        {tasks.length === 0 ? (
          <div className="board-column-empty">Drop tasks here</div>
        ) : (
          tasks.map((task) => <TaskCard key={task._id} task={task} onStatusChange={onTaskMove} />)
        )}
      </div>
    </div>
  );
};

export default BoardColumn;
