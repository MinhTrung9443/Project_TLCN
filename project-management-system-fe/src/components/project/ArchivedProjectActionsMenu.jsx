// src/components/project/ArchivedProjectActionsMenu.jsx

import React, { useState, useRef, useEffect } from 'react';

const ArchivedProjectActionsMenu = ({ project, onRestore, onDelete }) => {
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

  return (
    <div className="project-actions-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setIsOpen(!isOpen)} className="actions-trigger-btn">
        ⋮
      </button>

      {isOpen && (
        <ul className="actions-dropdown">
          <li>
            <button onClick={() => { onRestore(project); setIsOpen(false); }}>
              <span style={{ marginRight: '8px' }}>🔄</span> Restore Project
            </button>
          </li>
          <li>
            <button className="delete-option" onClick={() => { onDelete(project); setIsOpen(false); }}>
              <span style={{ marginRight: '8px' }}>🗑️</span> Delete Project
            </button>
          </li>
        </ul>
      )}
    </div>
  );
};

export default ArchivedProjectActionsMenu;