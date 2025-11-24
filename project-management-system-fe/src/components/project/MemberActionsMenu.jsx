import React, { useState, useContext, useEffect, useRef } from 'react';
import { ProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import "../../styles/pages/ManageProject/MemberActionsMenu.css";

const MemberActionsMenu = ({ item, onRemoveMember, onRemoveTeam, onChangeRole, onChangeLeader }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();
    const { userProjectRole } = useContext(ProjectContext);
    const menuRef = useRef(null); // Ref để xử lý click ra ngoài

    // Kiểm tra quyền quản lý
    const canManage = userProjectRole === 'PROJECT_MANAGER' || (user && user.role === 'admin');

    // Xử lý click ra ngoài để đóng menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    if (!canManage) return <div className="actions-placeholder"></div>; // Trả về một div trống để giữ layout

    // Không hiển thị menu cho chính PM
    if (!item.isTeam && item.role === 'PROJECT_MANAGER') {
        return <div className="actions-placeholder"></div>;
    }

    const renderMenu = () => {
        if (item.isTeam) { // Nếu là một Team
            return (
                <ul className="dropdown-menu">
                    <li onClick={() => { onChangeLeader(item.team); setIsOpen(false); }}>Change Leader</li>
                    <li className="danger" onClick={() => { onRemoveTeam(item.team); setIsOpen(false); }}>Remove Team</li>
                </ul>
            );
        } else { // Nếu là một Member hoặc Leader
            return (
                <ul className="dropdown-menu">
                    {item.role !== 'LEADER' && <li onClick={() => { onChangeRole(item, 'LEADER'); setIsOpen(false); }}>Set as Leader</li>}
                    {item.role !== 'MEMBER' && <li onClick={() => { onChangeRole(item, 'MEMBER'); setIsOpen(false); }}>Set as Member</li>}
                    <li className="danger" onClick={() => { onRemoveMember(item); setIsOpen(false); }}>Remove from Project</li>
                </ul>
            );
        }
    };

    return (
        // [QUAN TRỌNG] Bọc toàn bộ bằng một div có ref và class
        <div className="actions-menu-container" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="actions-btn">⋮</button>
            {isOpen && renderMenu()}
        </div>
    );
};

export default MemberActionsMenu;