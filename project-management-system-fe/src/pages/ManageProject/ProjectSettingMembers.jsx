// src/pages/ManageProject/ProjectSettingMembers.jsx
// [PHIÊN BẢN HOÀN THIỆN]

import React, { useState, useContext, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ProjectContext } from '../../contexts/ProjectContext';
import AddMemberModal from '../../components/project/AddMemberModal';
import { getProjectMembers } from '../../services/projectService'; // Vẫn cần để fetch lại
import '../../styles/pages/ManageProject/ProjectMembersTab.css';

const ProjectSettingMembers = () => {
    // Lấy dữ liệu và quyền từ Context
    const { projectData, userProjectRole, setProjectKey } = useContext(ProjectContext);
    const { projectKey } = useParams();
    const canManageMembers = userProjectRole === 'PROJECT_MANAGER';

    const [isModalOpen, setIsModalOpen] = useState(false);

    // Hàm để tải lại dữ liệu cho context khi có thay đổi (thêm/xóa member)
    const refreshProjectData = useCallback(() => {
        // Gọi lại setProjectKey sẽ kích hoạt việc fetch lại dữ liệu trong ProjectProvider
        setProjectKey(projectKey); 
    }, [projectKey, setProjectKey]);

    const handleMemberAdded = () => {
        setIsModalOpen(false);
        refreshProjectData(); // Tải lại dữ liệu sau khi thêm thành công
        toast.success('Member added successfully!');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-CA');
    };

    if (!projectData) {
        return <div>Loading members...</div>;
    }

    const members = projectData.members || [];
    const existingMemberIds = members.map(m => m.userId?._id).filter(Boolean);

    return (
        <div className="project-members-container">
            {canManageMembers && (
                <div className="members-actions-header">
                    <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">Add Member</button>
                </div>
            )}
            
            <div className="members-list-table">
                <div className="table-header">
                    <div>Project Member</div>
                    <div>Role</div>
                    <div>Added On</div>
                    <div></div> {/* Cột cho Actions Menu */}
                </div>
                {members.map(member => (
                    member.userId && ( 
                        <div className="table-row" key={member.userId._id}>
                            <div className="member-info">
                                <img src={member.userId.avatar || '/default-avatar.png'} alt={member.userId.fullname} className="member-avatar" />
                                <span>{member.userId.fullname}</span>
                            </div>
                            <div>{member.role}</div>
                            <div>{formatDate(member.addedOn)}</div>
                            <div>
                                {/* Placeholder cho Actions Menu (xóa, đổi vai trò) */}
                                {/* Bạn sẽ cần tạo một component ActionsMenu ở đây */}
                                <button className="actions-btn">⋮</button>
                            </div>
                        </div>
                    )
                ))}
            </div>

            {isModalOpen && (
                <AddMemberModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    projectKey={projectKey}
                    onMemberAdded={handleMemberAdded}
                    existingMemberIds={existingMemberIds}
                />
            )}
        </div>
    );
};

export default ProjectSettingMembers;