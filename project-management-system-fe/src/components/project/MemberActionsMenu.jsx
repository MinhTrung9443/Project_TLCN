import React, { useState, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; // <--- QUAN TRỌNG: Import cái này
import { ProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import "../../styles/pages/ManageProject/MemberActionsMenu.css";

const MemberActionsMenu = ({ item, onRemoveMember, onRemoveTeam, onChangeRole, onAddMemberToTeam, onRemoveMemberFromTeam, isTeamMember = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    
    const { user } = useAuth();
    const { userProjectRole } = useContext(ProjectContext);
    const buttonRef = useRef(null); // Đổi tên ref cho dễ hiểu

    const canManage = userProjectRole === 'PROJECT_MANAGER' || (user && user.role === 'admin');

    // Cập nhật vị trí liên tục khi scroll (để menu bám theo nút)
    const updatePosition = () => {
        if (buttonRef.current && isOpen) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY + 5,
                left: rect.right - 200 + window.scrollX // Trừ đi chiều rộng menu (ước lượng 200px)
            });
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Logic đóng menu: Nếu click không nằm trong nút bấm VÀ không nằm trong menu (kiểm tra class)
            if (buttonRef.current && buttonRef.current.contains(event.target)) {
                return;
            }
            // Check nếu click vào menu portal (dùng closest)
            if (event.target.closest('.dropdown-menu-portal')) {
                return;
            }
            setIsOpen(false);
        };

        if (isOpen) {
            updatePosition(); // Tính vị trí ngay khi mở
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
            setIsOpen(true);
            // setTimeout để đảm bảo render xong mới tính vị trí (fix lỗi tọa độ 0,0)
            setTimeout(() => updatePosition(), 0);
        } else {
            setIsOpen(false);
        }
    };

    if (!canManage) return <div className="actions-placeholder"></div>;
    if (!item) return <div className="actions-placeholder"></div>;

    if (!item.isTeam && item.role === 'PROJECT_MANAGER') {
        return <div className="actions-placeholder"></div>;
    }

    const renderMenuItems = () => {
        if (item.isTeam && item.team) {
            return (
                <>
                    <li onClick={() => { onAddMemberToTeam(item.team); setIsOpen(false); }}>Add Member to Team</li>
                    <li className="danger" onClick={() => { onRemoveTeam(item); setIsOpen(false); }}>Remove Team</li>
                </>
            );
        } else {
            return (
                <>
                    {item.role !== 'LEADER' && <li onClick={() => { onChangeRole(item, 'LEADER'); setIsOpen(false); }}>Set as Leader</li>}
                    {item.role !== 'MEMBER' && <li onClick={() => { onChangeRole(item, 'MEMBER'); setIsOpen(false); }}>Set as Member</li>}
                    
                    <hr className="menu-divider" /> 

                    {isTeamMember && item.role !== 'LEADER' && (
                        <li className="danger" onClick={() => { onRemoveMemberFromTeam(item); setIsOpen(false); }}>
                            Remove from Team
                        </li>
                    )}

                    <li className="danger" onClick={() => { onRemoveMember(item); setIsOpen(false); }}>
                        Remove from Project
                    </li>
                </>
            );
        }
    };

    // Nội dung Menu JSX
    const menuContent = (
        <ul 
            className="dropdown-menu dropdown-menu-portal" // Thêm class portal để style
            style={{
                position: 'fixed',
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                zIndex: 999999, // Max ping
                width: '200px',
                display: 'block', // Ép hiển thị
                visibility: 'visible', // Ép hiển thị
                opacity: 1 // Ép hiển thị
            }}
        >
            {renderMenuItems()}
        </ul>
    );

    return (
        <div className="actions-menu-container">
            <button ref={buttonRef} onClick={handleToggle} className="actions-btn">
                <span className="material-symbols-outlined" style={{fontSize: '20px'}}>more_vert</span>
            </button>
            
            {/* DÙNG PORTAL ĐỂ ĐẨY MENU RA BODY */}
            {isOpen && createPortal(menuContent, document.body)}
        </div>
    );
};

export default MemberActionsMenu;