import React, { useState, useContext, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ProjectContext } from "../../contexts/ProjectContext";
import { useAuth } from "../../contexts/AuthContext";

const MemberActionsMenu = ({ item, onRemoveMember, onRemoveTeam, onChangeRole, onAddMemberToTeam, onRemoveMemberFromTeam, isTeamMember = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const { user } = useAuth();
  const { userProjectRole } = useContext(ProjectContext);
  const buttonRef = useRef(null); // Đổi tên ref cho dễ hiểu

  const canManage = userProjectRole === "PROJECT_MANAGER" || (user && user.role === "admin");

  // Cập nhật vị trí liên tục khi scroll (để menu bám theo nút)
  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 5,
        left: rect.right - 220, // Trừ đi chiều rộng menu (220px)
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Nếu click vào button thì return (button sẽ handle toggle)
      if (buttonRef.current && buttonRef.current.contains(event.target)) {
        return;
      }
      // Nếu click vào menu (check parent ul) thì return
      const menuElement = event.target.closest("ul");
      if (menuElement && menuElement.style.position === "fixed") {
        return;
      }
      // Click ra ngoài -> đóng menu
      setIsOpen(false);
    };

    if (isOpen) {
      window.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      // Tính vị trí TRƯỚC khi mở menu
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 5,
          left: rect.right - 220,
        });
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  if (!canManage) return <div className="w-10"></div>;
  if (!item) return <div className="w-10"></div>;

  if (!item.isTeam && item.role === "PROJECT_MANAGER") {
    return <div className="w-10"></div>;
  }

  const renderMenuItems = () => {
    if (item.isTeam && item.team) {
      return (
        <>
          <li
            onClick={() => {
              onAddMemberToTeam(item.team);
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-primary-600">person_add</span>
            <span className="text-sm font-medium text-neutral-700">Add Member to Team</span>
          </li>
          <li
            onClick={() => {
              onRemoveTeam(item);
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-red-600">delete</span>
            <span className="text-sm font-medium text-red-600">Remove Team</span>
          </li>
        </>
      );
    } else {
      return (
        <>
          {item.role !== "LEADER" && (
            <li
              onClick={() => {
                onChangeRole(item, "LEADER");
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-primary-600">workspace_premium</span>
              <span className="text-sm font-medium text-neutral-700">Set as Leader</span>
            </li>
          )}
          {item.role !== "MEMBER" && (
            <li
              onClick={() => {
                onChangeRole(item, "MEMBER");
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-neutral-600">badge</span>
              <span className="text-sm font-medium text-neutral-700">Set as Member</span>
            </li>
          )}

          <div className="border-t border-neutral-200 my-1"></div>

          {isTeamMember && item.role !== "LEADER" && (
            <li
              onClick={() => {
                onRemoveMemberFromTeam(item);
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-red-600">person_remove</span>
              <span className="text-sm font-medium text-red-600">Remove from Team</span>
            </li>
          )}

          <li
            onClick={() => {
              onRemoveMember(item);
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-red-600">block</span>
            <span className="text-sm font-medium text-red-600">Remove from Project</span>
          </li>
        </>
      );
    }
  };

  // Nội dung Menu JSX - chỉ render khi có vị trí hợp lệ
  const menuContent =
    menuPosition.top > 0 ? (
      <ul
        className="bg-white rounded-lg shadow-lg border border-neutral-200 py-2 min-w-[220px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        style={{
          position: "fixed",
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
          zIndex: 9999,
        }}
      >
        {renderMenuItems()}
      </ul>
    ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-2 rounded-lg hover:bg-neutral-100 transition-colors flex items-center justify-center"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="material-symbols-outlined text-[20px] text-neutral-600">more_vert</span>
      </button>

      {/* DÙNG PORTAL ĐỂ ĐẨY MENU RA BODY */}
      {isOpen && createPortal(menuContent, document.body)}
    </div>
  );
};

export default MemberActionsMenu;
