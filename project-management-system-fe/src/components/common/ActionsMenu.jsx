// File: src/components/common/ActionsMenu.jsx

import React, { useState, useEffect, useRef } from "react";
import { FaEllipsisV, FaTrash, FaPaperclip } from "react-icons/fa";

const ActionsMenu = ({ onDelete, onAddAttachment, onAddAttachmentFromDocs }) => {
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

  const handleActionClick = (action, event) => {
    if (event && event.stopPropagation) event.stopPropagation();
    setIsOpen(false);
    // Delay calling the action to allow the click event to finish
    // This prevents modal/popover opened by the action from immediately
    // receiving the same click as an 'outside' click and closing.
    setTimeout(() => {
      if (typeof action === "function") action();
    }, 0);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <FaEllipsisV />
      </button>
      {isOpen && (
        <ul className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 list-none p-0 m-0">
          <li
            className="px-3 py-2 hover:bg-gray-100 text-gray-700 cursor-pointer flex items-center gap-3 transition-colors"
            onClick={(e) => handleActionClick(onAddAttachment, e)}
          >
            <span className="w-5 flex items-center justify-center text-base text-neutral-600">
              <FaPaperclip />
            </span>
            <span className="truncate">Add Attachment</span>
          </li>
          {onAddAttachmentFromDocs && (
            <li
              className="px-3 py-2 hover:bg-gray-100 text-gray-700 cursor-pointer flex items-center gap-3 transition-colors"
              onClick={(e) => handleActionClick(onAddAttachmentFromDocs, e)}
            >
              <span className="w-5 flex items-center justify-center text-base text-neutral-600">
                <FaPaperclip />
              </span>
              <span className="truncate">Attach from Project Docs</span>
            </li>
          )}
          <li
            className="px-3 py-2 hover:bg-red-50 text-red-600 cursor-pointer flex items-center gap-3 transition-colors"
            onClick={(e) => handleActionClick(onDelete, e)}
          >
            <span className="w-5 flex items-center justify-center text-base text-red-600">
              <FaTrash />
            </span>
            <span className="truncate">Delete Task</span>
          </li>
        </ul>
      )}
    </div>
  );
};

export default ActionsMenu;
