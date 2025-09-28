
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { getProjectMembers } from '../../services/projectService';
import AddMemberModal from '../../components/project/AddMemberModal';
import '../../styles/pages/ManageProject/ProjectMembersTab.css';

const ProjectSettingMembers = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const { projectKey } = useParams();
    const { setSelectedProjectKey } = useContext(ProjectContext);
    const [directMembers, setDirectMembers] = useState([]);
    const [groupMembers, setGroupMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const formatDate = (dateString) => {
    if (!dateString) {
        return 'N/A'; // Trả về N/A nếu không có ngày
    }
    const date = new Date(dateString);
    // Kiểm tra xem date có hợp lệ không
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', { // Dùng định dạng US hoặc en-CA tùy bạn
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getProjectMembers(projectKey);
            setDirectMembers(response.data.members || []);
            setGroupMembers(response.data.groups || []);
        } catch (error) {
            toast.error("Could not fetch project members.");
        } finally {
            setLoading(false);
        }
    }, [projectKey]);

    useEffect(() => {
        if (projectKey) {
            setSelectedProjectKey(projectKey.toUpperCase());
        }
    }, [projectKey, setSelectedProjectKey]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);
    
    const handleMemberAdded = () => {
        // Sau khi thêm thành công, đóng modal và tải lại danh sách
        setIsModalOpen(false);
        fetchMembers();
    };

    if (loading) return <div>Loading members...</div>;

    const existingMemberIds = directMembers.map(m => m.userId?._id).filter(Boolean);
    const existingGroupIds = groupMembers.map(g => g.groupId?._id).filter(Boolean);


    return (
        <div className="project-members-container">
            {isAdmin && (
                <div className="members-actions-header">
                    <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">Add Member</button>
                </div>
            )}
            
            <div className="members-list-table">
                <div className="table-header">
                    <div>Project Member</div>
                    <div>Role</div>
                    <div>Added On</div>
                    <div></div>
                </div>
                 {groupMembers.map(groupRelation => (
                    groupRelation.groupId && (
                        <div className="table-row" key={groupRelation.groupId._id}>
                            <div className="member-info">
                                <span className="material-symbols-outlined group-icon">group</span>
                                <span>{groupRelation.groupId.name} ({groupRelation.groupId.members?.length || 0} members)</span>
                            </div>
                            <div>{groupRelation.role}</div>
                            <div>{formatDate(groupRelation.addedOn)}</div>
                            <div>⋮</div>
                        </div>
                    )
                ))}
                {directMembers.map(member => (
                    member.userId && ( 
                        <div className="table-row" key={member.userId._id}>
                            <div className="member-info">
                                <img src={member.userId.avatar || '/default-avatar.png'} alt={member.userId.fullname} className="member-avatar" />
                                <span>{member.userId.fullname}</span>
                            </div>
                            <div>{member.role}</div>
                            <div>{formatDate(member.addedOn)}</div>
                            <div>⋮</div>
                        </div>
                    )
                ))}
            </div>

            <AddMemberModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                projectKey={projectKey}
                onMemberAdded={handleMemberAdded}
                existingMemberIds={existingMemberIds}
                existingGroupIds={existingGroupIds}
            />
        </div>
    );
};

export default ProjectSettingMembers;