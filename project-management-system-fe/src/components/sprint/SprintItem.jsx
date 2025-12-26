import React, { useState, useRef, useEffect, useContext } from "react";
import TaskList from "./taskItem";
import "../../styles/pages/ManageSprint/SprintList.css";
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
      <div className="sprint-card" key={sprint._id}>
        <div ref={drop} className={`sprint-card-dropzone${isOver ? " sprint-card-dropzone-over" : ""}`}>
          <div className="sprint-header">
            <button className="sprint-chevron-btn" onClick={() => setExpanded((prev) => !prev)}>
              <span className={`material-symbols-outlined sprint-chevron-icon${expanded ? " expanded" : ""}`}>chevron_right</span>
            </button>
            <span
              className={`sprint-title ${sprint.status === "Started" ? "sprint-title-clickable" : ""}`}
              onClick={() => onSprintNameClick && sprint.status === "Started" && onSprintNameClick(sprint)}
            >
              {sprint.name}
            </span>
            <span className="sprint-task-badge">{sprint.tasks?.length || 0} Tasks</span>
            {!isKanbanBoard && canManageSprints && sprint.status !== "Completed" && (
              <div className="sprint-header-menu" ref={openMenuId === sprint._id ? menuRef : null}>
                <button onClick={() => handleMenuToggle(sprint._id)} className="sprint-menu-btn">
                  <span className="material-symbols-outlined">more_horiz</span>
                </button>
                {openMenuId === sprint._id && (
                  <ul className="sprint-menu-list">
                    <li>
                      <button
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
                        className="sprint-menu-delete"
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
              <div className="sprint-status-row">
                <div className="sprint-status-box">
                  {sprint.status === "Not Start" && (
                    <span className="material-symbols-outlined sprint-status-icon sprint-status-notstarted">radio_button_unchecked</span>
                  )}
                  {sprint.status === "Started" && (
                    <span className="material-symbols-outlined sprint-status-icon sprint-status-started">schedule</span>
                  )}
                  {sprint.status === "Completed" && (
                    <span className="material-symbols-outlined sprint-status-icon sprint-status-completed">check_circle</span>
                  )}
                  <span className="sprint-status-text">{sprint.status}</span>
                  {/* Ẩn ngày nếu là Kanban Board */}
                  {!isKanbanBoard && (
                    <span className="sprint-date">
                      {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="task-list">
                <TaskList tasks={sprint.tasks} source={sprint._id} onDrop={onDrop} canDragDrop={canDragDrop} onTaskClick={onTaskClick} />
              </div>
              <div className="sprint-create-task-row">
                {canCreateTask && sprint.status !== "Completed" && (
                  <>
                    <button className="sprint-add-btn">
                      <span className="material-symbols-outlined">add_circle</span>
                    </button>
                    <span className="sprint-create-task-label" onClick={() => setIsModalOpen(true)}>
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
