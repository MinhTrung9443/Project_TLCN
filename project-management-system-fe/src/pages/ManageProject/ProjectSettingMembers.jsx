import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ProjectContext } from '../../contexts/ProjectContext';
import { getProjectMembers, removeMemberFromProject, removeTeamFromProject, changeMemberRole, changeTeamLeader } from '../../services/projectService';
import AddMemberModal from '../../components/project/AddMemberModal';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/pages/ManageProject/ProjectMembersTab.css'; // Cần thêm CSS cho thụt lề
import MemberActionsMenu from '../../components/project/MemberActionsMenu';

const ProjectSettingMembers = () => {
    const { userProjectRole } = useContext(ProjectContext);
    const { projectKey } = useParams();
    const { user } = useAuth();
    const canManageMembers = userProjectRole === 'PROJECT_MANAGER' || (user && user.role === 'admin');
    const [displayList, setDisplayList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // State để lưu dữ liệu gốc
    const [rawMembers, setRawMembers] = useState([]);
    const [rawTeams, setRawTeams] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getProjectMembers(projectKey);
            // API trả về { data: { members, teams } }
            setRawMembers(response.data.members || []);
            setRawTeams(response.data.teams || []);
        } catch (error) {
            toast.error("Could not fetch project structure.");
        } finally {
            setLoading(false);
        }
    }, [projectKey]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // useEffect để xử lý dữ liệu và tạo danh sách hiển thị
    useEffect(() => {
        if (!loading) {
            const memberMap = new Map(rawMembers.map(m => [m.userId._id.toString(), m]));
            const memberIdsInTeams = new Set();

            const teamsWithMembers = rawTeams.map(team => {
                const leader = memberMap.get(team.leaderId._id.toString());
                
                // Lấy các member của team từ danh sách member tổng
                const membersOfTeam = (team.teamId.members || [])
                    .map(memberId => memberMap.get(memberId.toString()))
                    .filter(Boolean) // Lọc ra các member thực sự có trong dự án
                    .filter(member => member.userId._id.toString() !== team.leaderId._id.toString()); // Loại bỏ leader

                // Đánh dấu các member đã thuộc team
                if (leader) memberIdsInTeams.add(leader.userId._id.toString());
                membersOfTeam.forEach(m => memberIdsInTeams.add(m.userId._id.toString()));

                return { isTeam: true, team, leader, members: membersOfTeam };
            });

            const individualMembers = rawMembers.filter(m => !memberIdsInTeams.has(m.userId._id.toString()));

            setDisplayList([...teamsWithMembers, ...individualMembers]);
        }
    }, [rawMembers, rawTeams, loading]);

    const handleDataChanged = () => {
        setIsModalOpen(false);
        fetchData();
    };

    if (loading) return <div>Loading members...</div>;

    const existingMemberIds = rawMembers.map(m => m.userId._id);
    const existingTeamIds = rawTeams.map(t => t.teamId._id);

     const handleRemoveMember = async (member) => {
        if (window.confirm(`Are you sure you want to remove ${member.userId.fullname}?`)) {
            try {
                await removeMemberFromProject(projectKey, member.userId._id);
                toast.success("Member removed.");
                fetchData();
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to remove member.");
            }
        }
    };

    const handleRemoveTeam = async (team) => {
        if (window.confirm(`Are you sure you want to remove the team "${team.teamId.name}"?`)) {
            try {
                await removeTeamFromProject(projectKey, team.teamId._id);
                toast.success("Team removed.");
                fetchData();
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to remove team.");
            }
        }
    };

    const handleChangeRole = async (member, newRole) => {
        try {
            await changeMemberRole(projectKey, member.userId._id, { newRole });
            toast.success("Role updated.");
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to change role.");
        }
    };
    
    const handleChangeLeader = (team) => {
        // Logic này phức tạp hơn, cần mở một modal mới để chọn leader mới
        // Tạm thời chỉ log ra console
        console.log("Change leader for team:", team.teamId.name);
        toast.info("Change Leader function is not implemented yet.");
    };


    return (
        <div className="project-members-container">
            {canManageMembers && (
                <div className="members-actions-header">
                    <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">Add People / Team</button>
                </div>
            )}
            
            <div className="members-list-table">
                 <div className="table-header">
                    <div>Member / Team</div>
                    <div>Role</div>
                    <div>Source</div>
                    <div>Actions</div> {/* Đổi tên cột */}
                </div>
                
                {displayList.map((item) => {
                    if (item.isTeam) {
                        return (
                            <React.Fragment key={item.team.teamId._id}>
                                <div className="table-row team-row">
                                    <strong>{item.team.teamId.name} ({item.team.teamId.members.length} members)</strong>
                                    <span>TEAM</span>
                                    <span></span>
                                    <div>
                                        <MemberActionsMenu 
                                            item={item}
                                            onRemoveTeam={handleRemoveTeam}
                                            onChangeLeader={handleChangeLeader}
                                        />
                                    </div>
                                </div>
                                {item.leader && (
                                    <div className="table-row member-row indented">
                                        <div className="member-info">
                                            <img src={item.leader.userId.avatar || '/default-avatar.png'} alt="" className="member-avatar" />
                                            <span>{item.leader.userId.fullname}</span>
                                        </div>
                                        <div>{item.leader.role}</div>
                                        <div>Added via {item.team.teamId.name}</div>
                                        <button className="actions-btn">⋮</button>
                                    </div>
                                )}
                                {item.members.map(member => (
                                    <div className="table-row member-row indented" key={member.userId._id}>
                                        <div className="member-info">
                                            <img src={member.userId.avatar || '/default-avatar.png'} alt="" className="member-avatar" />
                                            <span>{member.userId.fullname}</span>
                                        </div>
                                        <div>{member.role}</div>
                                        <div>Added via {item.team.teamId.name}</div>
                                        <button className="actions-btn">⋮</button>
                                    </div>
                                ))}
                            </React.Fragment>
                        );
                    } else {
                        return (
                            <div className="table-row member-row" key={item.userId._id}>
                                <div className="member-info">
                                    <img src={item.userId.avatar || '/default-avatar.png'} alt="" className="member-avatar" />
                                    <span>{item.userId.fullname}</span>
                                </div>
                                <div>{item.role}</div>
                                <div>Added individually</div>
                                 <div>
                                    <MemberActionsMenu 
                                        item={item}
                                        onRemoveMember={handleRemoveMember}
                                        onChangeRole={handleChangeRole}
                                    />
                                </div>
                            </div>
                        );
                    }
                })}
                 {displayList.length === 0 && <div className="no-data-message">No members in this project yet.</div>}
            </div>

            {isModalOpen && (
                <AddMemberModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    projectKey={projectKey}
                    onMemberAdded={handleDataChanged}
                    existingMemberIds={existingMemberIds}
                    existingTeamIds={existingTeamIds}
                />
            )}
        </div>
    );
};

export default ProjectSettingMembers;