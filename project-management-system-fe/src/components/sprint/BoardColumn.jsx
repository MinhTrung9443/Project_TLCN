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
    [status, workflow],
  );

  const getCategoryColor = () => {
    switch (status.category) {
      case "To Do":
        return "from-gray-500 to-gray-600";
      case "In Progress":
        return "from-blue-500 to-blue-600";
      case "Done":
        return "from-green-500 to-green-600";
      default:
        return "from-purple-500 to-purple-600";
    }
  };

  return (
    <div className="flex flex-col bg-gray-50 rounded-lg border border-gray-200 min-w-[300px]" ref={drop}>
      <div className={`bg-gradient-to-r ${getCategoryColor()} text-white px-4 py-3 rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{status.name}</span>
            <span className="text-sm opacity-90">({status.category})</span>
          </div>
          <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-sm font-medium">{tasks.length}</span>
        </div>
      </div>
      <div
        className={`flex-1 p-3 min-h-[400px] ${isOver && canDrop ? "bg-purple-50 border-2 border-purple-300" : ""} ${isOver && !canDrop ? "bg-red-50 border-2 border-red-300" : ""}`}
      >
        {isOver && !canDrop && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-red-600">
            <span className="material-symbols-outlined text-4xl">block</span>
            <span className="font-medium">Transition not allowed</span>
          </div>
        )}
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-400 text-sm">Drop tasks here</div>
        ) : (
          tasks.map((task) => <TaskCard key={task._id} task={task} />)
        )}
      </div>
    </div>
  );
};

export default BoardColumn;
