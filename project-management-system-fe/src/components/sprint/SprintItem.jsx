import React, { useState, useRef, useEffect } from "react";
import TaskList from "./taskItem";
import "../../styles/pages/ManageSprint/SprintList.css";
import { useDrop } from "react-dnd";

const SprintItem = ({ sprint, onDrop, onEdit, onStart, onComplete, onDelete }) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

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

  return (
    <div className="sprint-card" key={sprint._id}>
      <div ref={drop} className={`sprint-card-dropzone${isOver ? " sprint-card-dropzone-over" : ""}`}>
        <div className="sprint-header">
          <button className="sprint-chevron-btn">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          <span className="sprint-title">{sprint.name}</span>
          <span className="sprint-task-badge">{sprint.tasks?.length || 0} Tasks</span>
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
        </div>
        <div className="sprint-status-row">
          <div className="sprint-status-box">
            {sprint.status === "Not Start" && (
              <span className="material-symbols-outlined sprint-status-icon sprint-status-notstarted">radio_button_unchecked</span>
            )}
            {sprint.status === "Started" && <span className="material-symbols-outlined sprint-status-icon sprint-status-started">schedule</span>}
            {sprint.status === "Completed" && (
              <span className="material-symbols-outlined sprint-status-icon sprint-status-completed">check_circle</span>
            )}
            <span className="sprint-status-text">{sprint.status}</span>
            <span className="sprint-date">
              {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="task-list">
          <TaskList tasks={sprint.tasks} source={sprint._id} onDrop={onDrop} />
        </div>
        <div className="sprint-create-task-row">
          <button className="sprint-add-btn">
            <span className="material-symbols-outlined">add_circle</span>
          </button>
          <span className="sprint-create-task-label">Create Task</span>
        </div>
      </div>
    </div>
  );
};

export default SprintItem;
