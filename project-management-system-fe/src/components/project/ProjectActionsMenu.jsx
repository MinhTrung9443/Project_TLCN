// src/components/project/ProjectActionsMenu.jsx

import React, { useState, useRef, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ProjectContext } from "../../contexts/ProjectContext";
import "../../styles/components/ProjectActionsMenu.css";

const ProjectActionsMenu = ({ project, onDelete, onClone }) => {
  const { user } = useAuth();
  const { setSelectedProjectKey } = useContext(ProjectContext);
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

  const handleSettingsClick = () => {
    setSelectedProjectKey(project.key.toUpperCase());
    setIsOpen(false);
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="project-actions-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setIsOpen(!isOpen)} className="actions-trigger-btn">
        <span className="material-symbols-outlined">more_vert</span>
      </button>

      {isOpen && (
        <div className="actions-dropdown">
          <Link to={`/app/task-mgmt/projects/${project.key}/settings/general`} onClick={handleSettingsClick} className="dropdown-item">
            <span className="material-symbols-outlined">settings</span>
            Project Settings
          </Link>
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

export default ProjectActionsMenu;
