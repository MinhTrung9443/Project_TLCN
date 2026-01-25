import React, { useState, useRef, useEffect, useContext } from "react";
import TaskList from "./taskItem";
import { useDrop } from "react-dnd";
import CreateTaskModal from "../../components/task/CreateTaskModal";

const SprintItem = ({
  sprint,
  onDrop,
  onEdit,
  onStart,
  onComplete,
  onDelete,
  onSprintNameClick,
  onTaskClick,
  projectType,
  canManageSprints,
  canCreateTask,
  canDragDrop,
}) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Check if this is a Kanban Board sprint
  const isKanbanBoard = projectType === "Kanban" && sprint.name === "Kanban Board";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMenuToggle = (sprintId) => {
    setOpenMenuId(openMenuId === sprintId ? null : sprintId);
  };

  const [{ isOver }, drop] = useDrop({
    accept: "task",
    drop: (item) => onDrop(item, sprint._id),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const handleTaskCreated = (newTask) => {
    sprint.tasks = [...(sprint.tasks || []), newTask];
    setIsModalOpen(false);
  };

  return (
    <>
      <CreateTaskModal
        sprint={sprint}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskCreated={handleTaskCreated}
        defaultProjectId={sprint.projectId}
      />
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4" key={sprint._id}>
        <div ref={drop} className={`p-4 ${isOver ? "bg-purple-50 border-2 border-purple-300" : ""}`}>
          <div className="flex items-center gap-3 mb-3">
            <button className="p-1 hover:bg-gray-100 rounded transition-colors" onClick={() => setExpanded((prev) => !prev)}>
              <span className={`material-symbols-outlined text-gray-600 transition-transform ${expanded ? "rotate-90" : ""}`}>chevron_right</span>
            </button>
            <span
              className={`text-lg font-semibold text-gray-900 flex-1 ${sprint.status === "Started" ? "cursor-pointer hover:text-purple-600" : ""}`}
              onClick={() => onSprintNameClick && sprint.status === "Started" && onSprintNameClick(sprint)}
            >
              {sprint.name}
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">{sprint.tasks?.length || 0} Tasks</span>
            {!isKanbanBoard && canManageSprints && sprint.status !== "Completed" && (
              <div className="relative" ref={openMenuId === sprint._id ? menuRef : null}>
                <button onClick={() => handleMenuToggle(sprint._id)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-gray-600">more_horiz</span>
                </button>
                {openMenuId === sprint._id && (
                  <ul className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <li>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors"
                        onClick={() => {
                          onEdit(sprint);
                          setOpenMenuId(null);
                        }}
                      >
                        Edit
                      </button>
                    </li>
                    {sprint.status === "Not Start" && (
                      <li>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors"
                          onClick={() => {
                            onStart(sprint);
                            setOpenMenuId(null);
                          }}
                        >
                          Start Sprint
                        </button>
                      </li>
                    )}
                    {sprint.status === "Started" && (
                      <li>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors"
                          onClick={() => {
                            onComplete(sprint);
                            setOpenMenuId(null);
                          }}
                        >
                          Complete Sprint
                        </button>
                      </li>
                    )}
                    <li>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition-colors"
                        onClick={() => {
                          onDelete(sprint);
                          setOpenMenuId(null);
                        }}
                      >
                        Delete
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>
          {expanded && (
            <>
              <div className="mb-3">
                <div className="flex items-center gap-3">
                  {sprint.status === "Not Start" && <span className="material-symbols-outlined text-gray-400">radio_button_unchecked</span>}
                  {sprint.status === "Started" && <span className="material-symbols-outlined text-blue-500">schedule</span>}
                  {sprint.status === "Completed" && <span className="material-symbols-outlined text-green-500">check_circle</span>}
                  <span className="text-sm font-medium text-gray-700">{sprint.status}</span>
                  {/* Ẩn ngày nếu là Kanban Board */}
                  {!isKanbanBoard && (
                    <span className="text-sm text-gray-500">
                      {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="mb-3">
                <TaskList tasks={sprint.tasks} source={sprint._id} onDrop={onDrop} canDragDrop={canDragDrop} onTaskClick={onTaskClick} />
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                {canCreateTask && sprint.status !== "Completed" && (
                  <>
                    <button className="text-purple-600 hover:text-purple-700">
                      <span className="material-symbols-outlined">add_circle</span>
                    </button>
                    <span className="text-sm text-purple-600 hover:text-purple-700 cursor-pointer font-medium" onClick={() => setIsModalOpen(true)}>
                      Create Task
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default SprintItem;
