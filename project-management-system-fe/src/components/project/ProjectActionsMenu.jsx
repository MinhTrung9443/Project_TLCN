// src/components/project/ProjectActionsMenu.jsx

import React, { useState, useRef, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ProjectContext } from "../../contexts/ProjectContext";

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
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors"
      >
        <span className="material-symbols-outlined">more_vert</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-10">
          <Link
            to={`/app/task-mgmt/projects/${project.key}/settings/general`}
            onClick={handleSettingsClick}
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors no-underline"
          >
            <span className="material-symbols-outlined text-base">settings</span>
            Project Settings
          </Link>
          <button
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => {
              onDelete(project);
              setIsOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-base">delete</span>
            Delete Project
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectActionsMenu;
