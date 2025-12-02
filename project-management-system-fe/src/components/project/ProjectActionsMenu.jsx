// src/components/project/ProjectActionsMenu.jsx

import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ProjectContext } from '../../contexts/ProjectContext';

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
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSettingsClick = () => {
    setSelectedProjectKey(project.key.toUpperCase());
    setIsOpen(false); 
  };
  
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="project-actions-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setIsOpen(!isOpen)} className="actions-trigger-btn">
        ⋮
      </button>

      {isOpen && (
        <ul className="actions-dropdown">
          <li>
            <Link 
              to={`/task-mgmt/projects/${project.key}/settings/general`} 
              onClick={handleSettingsClick}
            >
              Project Settings
            </Link>
          </li>
          <li>
            <button onClick={() => { onClone(project); setIsOpen(false); }}>Clone Project</button>
          </li>
          <li>
            <button className="delete-option" onClick={() => { onDelete(project); setIsOpen(false); }}>Archived Project</button>
          </li>
        </ul>
      )}
    </div>
  );
};

export default ProjectActionsMenu;