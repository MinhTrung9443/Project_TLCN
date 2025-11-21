import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ProjectContext } from '../../contexts/ProjectContext';
import { getProjectMembers } from '../../services/projectService';
import AddMemberModal from '../../components/project/AddMemberModal';
import '../../styles/pages/ManageProject/ProjectMembersTab.css'; // Cần thêm CSS cho thụt lề

const ProjectSettingMembers = () => {
    const { userProjectRole } = useContext(ProjectContext);
    const { projectKey } = useParams();
    const canManageMembers = userProjectRole === 'PROJECT_MANAGER'|| 'admin' ;

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
                    <div></div>
                </div>
                
                {displayList.map((item, index) => {
                    if (item.isTeam) {
                        return (
                            <React.Fragment key={item.team.teamId._id}>
                                <div className="table-row team-row">
                                    <strong>{item.team.teamId.name} ({item.team.teamId.members.length} members)</strong>
                                    <span>TEAM</span>
                                    <span></span>
                                    <button className="actions-btn">⋮</button>
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
                                <button className="actions-btn">⋮</button>
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
                />
            )}
        </div>
    );
};

export default ProjectSettingMembers;