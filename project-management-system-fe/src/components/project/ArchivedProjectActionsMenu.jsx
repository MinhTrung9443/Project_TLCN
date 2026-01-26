// src/components/project/ArchivedProjectActionsMenu.jsx

import React, { useState, useRef, useEffect } from "react";

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
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors"
      >
        <span className="material-symbols-outlined">more_vert</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-10">
          <button
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            onClick={() => {
              onRestore(project);
              setIsOpen(false);
            }}
          >
            <span className="material-symbols-outlined text-base">restore</span>
            Restore Project
          </button>
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

export default ArchivedProjectActionsMenu;
