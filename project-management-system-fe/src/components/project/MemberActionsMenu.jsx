import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ProjectContext } from "../../contexts/ProjectContext";
import { useAuth } from "../../contexts/AuthContext";

const MemberActionsMenu = ({ item, onRemoveMember, onRemoveTeam, onChangeRole, onAddMemberToTeam, onRemoveMemberFromTeam, isTeamMember = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuConfig, setMenuConfig] = useState({ top: 0, left: 0, openUpwards: false });

  const { user } = useAuth();
  // Dùng React.useContext để an toàn nếu import ở trên bị thiếu
  const { userProjectRole } = React.useContext(ProjectContext); 
  const buttonRef = useRef(null);

  const canManage = userProjectRole === "PROJECT_MANAGER" || (user && user.role === "admin");
  const MENU_WIDTH = 220; // Khai báo chiều rộng menu cố định để tính toán

  const handleToggle = (e) => {
    e.preventDefault(); 
    e.stopPropagation();

    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const screenHeight = window.innerHeight;
      const spaceBelow = screenHeight - rect.bottom;
      
      const shouldOpenUpwards = spaceBelow < 220; 

      // TÍNH TOÁN LẠI VỊ TRÍ LEFT:
      // Thay vì dùng translateX(-100%), ta tính toán trực tiếp tọa độ Left
      // Left = Cạnh phải nút bấm - Chiều rộng Menu
      const calculatedLeft = rect.right - MENU_WIDTH;

      setMenuConfig({
        top: shouldOpenUpwards ? rect.top - 5 : rect.bottom + 5,
        left: calculatedLeft, 
        openUpwards: shouldOpenUpwards,
      });
      setIsOpen(true);
    }
  };

  if (!canManage) return <div className="w-8 h-8"></div>;
  if (!item) return <div className="w-8 h-8"></div>;
  if (!item.isTeam && item.role === "PROJECT_MANAGER") return <div className="w-8 h-8"></div>;

  const renderMenuItems = () => {
    const handleAction = (action) => {
      setIsOpen(false);
      setTimeout(() => action(), 0);
    };

    if (item.isTeam && item.team) {
      return (
        <>
          <li onClick={(e) => { e.stopPropagation(); handleAction(() => onAddMemberToTeam(item.team)); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 cursor-pointer transition-colors">
            <span className="material-symbols-outlined text-[20px] text-primary-600">person_add</span>
            <span className="text-sm font-medium text-neutral-700">Add Member to Team</span>
          </li>
          <li onClick={(e) => { e.stopPropagation(); handleAction(() => onRemoveTeam(item)); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 cursor-pointer transition-colors">
            <span className="material-symbols-outlined text-[20px] text-red-600">delete</span>
            <span className="text-sm font-medium text-red-600">Remove Team</span>
          </li>
        </>
      );
    } else {
      return (
        <>
          {item.role !== "LEADER" && (
            <li onClick={(e) => { e.stopPropagation(); handleAction(() => onChangeRole(item, "LEADER")); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 cursor-pointer transition-colors">
              <span className="material-symbols-outlined text-[20px] text-primary-600">workspace_premium</span>
              <span className="text-sm font-medium text-neutral-700">Set as Leader</span>
            </li>
          )}
          {item.role !== "MEMBER" && (
            <li onClick={(e) => { e.stopPropagation(); handleAction(() => onChangeRole(item, "MEMBER")); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 cursor-pointer transition-colors">
              <span className="material-symbols-outlined text-[20px] text-neutral-600">badge</span>
              <span className="text-sm font-medium text-neutral-700">Set as Member</span>
            </li>
          )}

          <div className="border-t border-neutral-200 my-1"></div>

          {isTeamMember && item.role !== "LEADER" && (
            <li onClick={(e) => { e.stopPropagation(); handleAction(() => onRemoveMemberFromTeam(item)); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 cursor-pointer transition-colors">
              <span className="material-symbols-outlined text-[20px] text-red-600">person_remove</span>
              <span className="text-sm font-medium text-red-600">Remove from Team</span>
            </li>
          )}

          <li onClick={(e) => { e.stopPropagation(); handleAction(() => onRemoveMember(item)); }} className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 cursor-pointer transition-colors">
            <span className="material-symbols-outlined text-[20px] text-red-600">block</span>
            <span className="text-sm font-medium text-red-600">Remove from Project</span>
          </li>
        </>
      );
    }
  };

  const menuPortal = isOpen ? (
    <>
      <div 
        className="fixed inset-0 z-[9998] cursor-default bg-transparent"
        onMouseDown={(e) => {
          e.stopPropagation();
          setIsOpen(false);
        }}
      />

      <ul
        // 1. Thêm m-0 p-0 để loại bỏ padding mặc định của browser
        // 2. Bỏ các class animation (animate-in slide-in...) để tránh xung đột vị trí
        className="fixed bg-white rounded-lg shadow-xl border border-neutral-200 py-2 m-0 p-0 overflow-hidden z-[9999]"
        style={{
          width: `${MENU_WIDTH}px`, // Set cứng width ở đây
          top: `${menuConfig.top}px`,
          left: `${menuConfig.left}px`,
          // Chỉ transform Y nếu mở lên trên, không can thiệp X nữa
          transform: menuConfig.openUpwards ? 'translateY(-100%)' : 'none', 
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {renderMenuItems()}
      </ul>
    </>
  ) : null;

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onMouseDown={handleToggle}
        onClick={(e) => e.preventDefault()}
        className={`p-2 rounded-lg transition-colors flex items-center justify-center outline-none ${isOpen ? 'bg-neutral-200' : 'hover:bg-neutral-100'}`}
      >
        <span className="material-symbols-outlined text-[20px] text-neutral-600 select-none pointer-events-none">more_vert</span>
      </button>

      {createPortal(menuPortal, document.body)}
    </div>
  );
};

export default MemberActionsMenu;