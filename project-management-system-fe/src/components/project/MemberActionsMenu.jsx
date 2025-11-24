import React, { useState, useContext, useEffect, useRef } from 'react';
import { ProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import "../../styles/pages/ManageProject/MemberActionsMenu.css";

const MemberActionsMenu = ({ item, onRemoveMember, onRemoveTeam, onChangeRole, onChangeLeader, onAddMemberToTeam, onRemoveMemberFromTeam }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();
    const { userProjectRole } = useContext(ProjectContext);
    const menuRef = useRef(null);

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

    if (!canManage) return <div className="actions-placeholder"></div>;
    if (!item) return <div className="actions-placeholder"></div>;

    // Không hiển thị menu cho chính PM
    if (!item.isTeam && item.role === 'PROJECT_MANAGER') {
        return <div className="actions-placeholder"></div>;
    }

    const renderMenu = () => {
        if (item.isTeam && item.team) {
            return (
                <ul className="dropdown-menu">
                    <li onClick={() => { onAddMemberToTeam(item.team); setIsOpen(false); }}>Add Member to Team</li>
                    <li className="danger" onClick={() => { onRemoveTeam(item.team); setIsOpen(false); }}>Remove Team</li>
                </ul>
            );
        } 
        else if (!item.isTeam) {
            const source = item.source || ''; 
            const isInTeam = source.startsWith('Added via');

            return (
                <ul className="dropdown-menu">
                    {item.role !== 'LEADER' && <li onClick={() => { onChangeRole(item, 'LEADER'); setIsOpen(false); }}>Set as Leader</li>}
                    {item.role !== 'MEMBER' && <li onClick={() => { onChangeRole(item, 'MEMBER'); setIsOpen(false); }}>Set as Member</li>}
                    
                    <hr className="menu-divider" /> 

                    {isInTeam && item.role !== 'LEADER' && (
                        <li className="danger" onClick={() => { onRemoveMemberFromTeam(item); setIsOpen(false); }}>
                            Remove from Team
                        </li>
                    )}

                    <li className="danger" onClick={() => { onRemoveMember(item); setIsOpen(false); }}>
                        Remove from Project
                    </li>
                </ul>
            );
        }
        return null;
    };

    return (
        <div className="actions-menu-container" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="actions-btn">⋮</button>
            {isOpen && renderMenu()}
        </div>
    );
};

export default MemberActionsMenu;