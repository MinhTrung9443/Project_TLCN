
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
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getProjectMembers(projectKey);
            setMembers(response.data);
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
                {/* Danh sách member */}
                {members.map(member => (
                    <div className="table-row" key={member._id}>
                        <div className="member-info">
                            <img src={member.userId.avatar || '/default-avatar.png'} alt={member.userId.fullname} className="member-avatar" />
                            <span>{member.userId.fullname}</span>
                        </div>
                        <div>{member.role}</div>
                        <div>{new Date(member.addedOn).toLocaleDateString()}</div>
                        <div>⋮</div>
                    </div>
                ))}
            </div>

            <AddMemberModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                projectKey={projectKey}
                onMemberAdded={handleMemberAdded}
            />
        </div>
    );
};

export default ProjectSettingMembers;