// src/components/project/ProjectActionsMenu.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Dùng Link cho Project Settings
import { useAuth } from '../../contexts/AuthContext'; // Để kiểm tra quyền admin

const ProjectActionsMenu = ({ project, onDelete, onClone }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Xử lý click ra ngoài để đóng menu
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
  
  // Chỉ admin mới thấy menu này
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="project-actions-menu" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="actions-trigger-btn">
        ⋮
      </button>
      {isOpen && (
        <ul className="actions-dropdown">
          <li>
            <Link to={`/task-management/projects/${project._id}/settings`}>Project Settings</Link>
          </li>
          <li>
            <button onClick={() => { onClone(project); setIsOpen(false); }}>Clone Project</button>
          </li>
          <li>
            <button className="delete-option" onClick={() => { onDelete(project); setIsOpen(false); }}>Delete Project</button>
          </li>
        </ul>
      )}
    </div>
  );
};

export default ProjectActionsMenu;