// src/components/project/ArchivedProjectActionsMenu.jsx

import React, { useState, useRef, useEffect } from "react";
import "../../styles/components/ArchivedProjectActionsMenu.css";

const ArchivedProjectActionsMenu = ({ project, onRestore, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="project-actions-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setIsOpen(!isOpen)} className="actions-trigger-btn">
        <span className="material-symbols-outlined">more_vert</span>
      </button>

      {isOpen && (
        <div className="actions-dropdown">
          <button
            className="dropdown-item"
            onClick={() => {
              onRestore(project);
              setIsOpen(false);
            }}
          >
            <span className="material-symbols-outlined">restore</span>
            Restore Project
          </button>
          <button
            className="dropdown-item delete-item"
            onClick={() => {
              onDelete(project);
              setIsOpen(false);
            }}
          >
            <span className="material-symbols-outlined">delete</span>
            Delete Project
          </button>
        </div>
      )}
    </div>
  );
};

export default ArchivedProjectActionsMenu;
