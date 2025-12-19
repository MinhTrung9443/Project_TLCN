// File: src/components/common/ActionsMenu.jsx

import React, { useState, useEffect, useRef } from "react";
import { FaEllipsisV, FaTrash, FaPaperclip } from "react-icons/fa";
import "../common/ActionsMenu.css"; // Sẽ tạo file này

const ActionsMenu = ({ onDelete, onAddAttachment }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Xử lý click ra ngoài để đóng menu
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
    setIsOpen(false); // Đóng menu sau khi chọn
    action();
  };

  return (
    <div className="actions-menu-container" ref={menuRef}>
      <button className="actions-menu-trigger" onClick={() => setIsOpen(!isOpen)}>
        <FaEllipsisV />
      </button>
      {isOpen && (
        <ul className="actions-menu-dropdown">
          <li onClick={() => handleActionClick(onAddAttachment)}>
            <FaPaperclip />
            <span>Add Attachment</span>
          </li>
          <li className="danger" onClick={() => handleActionClick(onDelete)}>
            <FaTrash />
            <span>Delete Task</span>
          </li>
        </ul>
      )}
    </div>
  );
};

export default ActionsMenu;
