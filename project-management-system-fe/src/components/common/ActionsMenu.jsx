// File: src/components/common/ActionsMenu.jsx

import React, { useState, useEffect, useRef } from "react";
import { FaEllipsisV, FaTrash, FaPaperclip } from "react-icons/fa";

const ActionsMenu = ({ onDelete, onAddAttachment }) => {
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

  const handleActionClick = (action) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <FaEllipsisV />
      </button>
      {isOpen && (
        <ul className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
          <li
            className="px-4 py-2 hover:bg-gray-100 text-gray-700 cursor-pointer flex items-center gap-3 transition-colors"
            onClick={() => handleActionClick(onAddAttachment)}
          >
            <FaPaperclip />
            <span>Add Attachment</span>
          </li>
          <li
            className="px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer flex items-center gap-3 transition-colors"
            onClick={() => handleActionClick(onDelete)}
          >
            <FaTrash />
            <span>Delete Task</span>
          </li>
        </ul>
      )}
    </div>
  );
};

export default ActionsMenu;
