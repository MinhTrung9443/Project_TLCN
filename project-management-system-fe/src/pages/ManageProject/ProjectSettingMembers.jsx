import React, { useState, useEffect, useContext, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ProjectContext } from "../../contexts/ProjectContext";
import {
  getProjectMembers,
  removeMemberFromProject,
  removeTeamFromProject,
  changeMemberRole,
  addMemberToTeamInProject,
  removeMemberFromTeamInProject,
} from "../../services/projectService";
import AddMemberModal from "../../components/project/AddMemberModal";
import { useAuth } from "../../contexts/AuthContext";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import "../../styles/pages/ManageProject/ProjectMembersTab.css"; // Cần thêm CSS cho thụt lề
import MemberActionsMenu from "../../components/project/MemberActionsMenu";
import AddMemberToTeamModal from "../../components/project/AddMemberToTeamModal"; // <-- Import modal mới

const ProjectSettingMembers = () => {
  const { userProjectRole } = useContext(ProjectContext);
  const { projectKey } = useParams();
  const { user } = useAuth();
  const canManageMembers = userProjectRole === "PROJECT_MANAGER" || (user && user.role === "admin");
  const [displayList, setDisplayList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddMemberToTeamModalOpen, setAddMemberToTeamModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  // State để lưu dữ liệu gốc
  const [rawMembers, setRawMembers] = useState([]);
  const [rawTeams, setRawTeams] = useState([]);

  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [isRemoveTeamModalOpen, setIsRemoveTeamModalOpen] = useState(false);
  const [removeMemberData, setRemoveMemberData] = useState(null);
  const [removeTeamData, setRemoveTeamData] = useState(null);

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
      const memberIdsInTeams = new Set();

      const teamsWithMembers = rawTeams.map((team) => {
        // Leader đã được populate từ backend, không cần lấy từ memberMap
        const leader = {
          userId: team.leaderId,
          role: "LEADER",
        };

        // Lấy các member của team từ team.members (đã được add vào project)
        // Leader KHÔNG có trong team.members, chỉ có trong team.leaderId
        const membersOfTeam = (team.members || []).map((member) => ({
          userId: member, // member đã được populate từ backend
          role: "MEMBER", // Members trong team có role MEMBER
        }));

        // Đánh dấu các member đã thuộc team
        memberIdsInTeams.add(team.leaderId._id.toString());
        membersOfTeam.forEach((m) => memberIdsInTeams.add(m.userId._id.toString()));

        return { isTeam: true, team, leader, members: membersOfTeam };
      });

      // Individual members: chỉ những người trong rawMembers và KHÔNG có trong teams
      const individualMembers = rawMembers.filter((m) => !memberIdsInTeams.has(m.userId._id.toString()));

      // Không hiển thị PM trong bảng nữa vì đã hiển thị ở trên
      const otherIndividualMembers = individualMembers.filter((m) => m.role !== "PROJECT_MANAGER");

      // Sắp xếp: teams trước, sau đó là individual members
      setDisplayList([...teamsWithMembers, ...otherIndividualMembers]);
    }
  }, [rawMembers, rawTeams, loading]);

  const handleDataChanged = () => {
    setIsAddModalOpen(false);
    setAddMemberToTeamModalOpen(false);
    fetchData();
  };
  if (loading) return <div>Loading members...</div>;

  // Lấy danh sách tất cả userId đã có trong project (cả members và teams)
  const existingMemberIds = [...rawMembers.map((m) => m.userId._id), ...rawTeams.flatMap((t) => [t.leaderId._id, ...t.members.map((m) => m._id)])];
  const existingTeamIds = rawTeams.map((t) => t.teamId._id);

  const handleRemoveMember = async () => {
    try {
      await removeMemberFromProject(projectKey, removeMemberData.userId._id);
      toast.success("Member removed.");
      fetchData();
      setIsRemoveMemberModalOpen(false);
      setRemoveMemberData(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member.");
    }
  };

  const handleRemoveTeam = async () => {
    try {
      await removeTeamFromProject(projectKey, removeTeamData.teamId._id);
      toast.success("Team removed.");
      fetchData();
      setIsRemoveTeamModalOpen(false);
      setRemoveTeamData(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove team.");
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

  const handleAddMemberToTeam = (team) => {
    setSelectedTeam(team);
    setAddMemberToTeamModalOpen(true);
  };

  // Tìm PM từ rawMembers
  const projectManager = rawMembers.find((m) => m.role === "PROJECT_MANAGER");

  return (
    <div className="project-members-container">
      {/* Hiển thị thông tin PM */}
      {projectManager && (
        <div className="pm-info-section">
          <h3>Project Manager</h3>
          <div className="pm-card">
            {projectManager.userId.avatar ? (
              <img src={projectManager.userId.avatar} alt="" className="pm-avatar" />
            ) : (
              <div className="pm-avatar avatar-placeholder">
                {(projectManager.userId.fullname || projectManager.userId.username || "PM").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="pm-details">
              <div className="pm-name">{projectManager.userId.fullname}</div>
              <div className="pm-email">{projectManager.userId.email}</div>
            </div>
          </div>
        </div>
      )}

      {canManageMembers && (
        <div className="members-actions-header">
          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
            Add People / Team
          </button>
        </div>
      )}

      <div className="members-list-table">
        <div className="table-header">
          <div>Member / Team</div>
          <div>Role</div>
          <div>Source</div>
          <div>Actions</div>
          {/* [SỬA] - Xóa MemberActionsMenu khỏi header */}
        </div>

        {displayList.map((item) => {
          if (item.isTeam) {
            return (
              <React.Fragment key={item.team.teamId._id}>
                <div className="table-row team-row">
                  <strong>
                    {item.team.teamId.name} ({(item.team.members?.length || 0) + 1} members)
                  </strong>
                  <span>TEAM</span>
                  <span></span>
                  <div>
                    <MemberActionsMenu
                      item={item}
                      onRemoveTeam={(team) => {
                        setRemoveTeamData(team);
                        setIsRemoveTeamModalOpen(true);
                      }}
                      onAddMemberToTeam={handleAddMemberToTeam}
                    />
                  </div>
                </div>
                {item.leader && (
                  <div className="table-row member-row indented">
                    <div className="member-info">
                      {item.leader.userId.avatar ? (
                        <img src={item.leader.userId.avatar} alt="" className="member-avatar" />
                      ) : (
                        <div className="member-avatar avatar-placeholder">
                          {(item.leader.userId.fullname || item.leader.userId.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>{item.leader.userId.fullname}</span>
                    </div>
                    <div>{item.leader.role}</div>
                    <div>Added via {item.team.teamId.name}</div>
                    <div>
                      <MemberActionsMenu
                        item={item.leader}
                        onRemoveMember={(member) => {
                          setRemoveMemberData(member);
                          setIsRemoveMemberModalOpen(true);
                        }}
                        onChangeRole={handleChangeRole}
                      />
                    </div>
                  </div>
                )}
                {item.members.map((member) => (
                  <div className="table-row member-row indented" key={member.userId._id}>
                    <div className="member-info">
                      {member.userId.avatar ? (
                        <img src={member.userId.avatar} alt="" className="member-avatar" />
                      ) : (
                        <div className="member-avatar avatar-placeholder">
                          {(member.userId.fullname || member.userId.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>{member.userId.fullname}</span>
                    </div>
                    <div>{member.role}</div>
                    <div>Added via {item.team.teamId.name}</div>
                    <div>
                      <MemberActionsMenu
                        item={member}
                        onRemoveMember={(m) => {
                          setRemoveMemberData(m);
                          setIsRemoveMemberModalOpen(true);
                        }}
                        onChangeRole={handleChangeRole}
                      />
                    </div>
                  </div>
                ))}
              </React.Fragment>
            );
          } else {
            return (
              <div className={`table-row member-row ${item.role === "PROJECT_MANAGER" ? "pm-row" : ""}`} key={item.userId._id}>
                <div className="member-info">
                  {item.userId.avatar ? (
                    <img src={item.userId.avatar} alt="" className="member-avatar" />
                  ) : (
                    <div className="member-avatar avatar-placeholder">
                      {(item.userId.fullname || item.userId.username || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{item.userId.fullname}</span>
                  {item.role === "PROJECT_MANAGER" && <span className="pm-badge">PM</span>}
                </div>
                <div>{item.role}</div>
                <div>Added individually</div>
                <div>
                  <MemberActionsMenu
                    item={item}
                    onRemoveMember={(m) => {
                      setRemoveMemberData(m);
                      setIsRemoveMemberModalOpen(true);
                    }}
                    onChangeRole={handleChangeRole}
                  />
                </div>
              </div>
            );
          }
        })}
        {displayList.length === 0 && <div className="no-data-message">No members in this project yet.</div>}
      </div>

      {isAddModalOpen && (
        <AddMemberModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          projectKey={projectKey}
          onMemberAdded={handleDataChanged}
          existingMemberIds={existingMemberIds}
          existingTeamIds={existingTeamIds}
        />
      )}

      {/* Modal phụ để thêm người vào một team đã có */}
      {isAddMemberToTeamModalOpen && (
        <AddMemberToTeamModal
          isOpen={isAddMemberToTeamModalOpen}
          onClose={() => setAddMemberToTeamModalOpen(false)}
          projectKey={projectKey}
          team={selectedTeam}
          onMemberAdded={handleDataChanged}
          existingMemberIds={existingMemberIds}
        />
      )}

      <ConfirmationModal
        isOpen={isRemoveMemberModalOpen}
        onClose={() => {
          setIsRemoveMemberModalOpen(false);
          setRemoveMemberData(null);
        }}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={`Are you sure you want to remove ${removeMemberData?.userId?.fullname || "this member"} from the project?`}
      />

      <ConfirmationModal
        isOpen={isRemoveTeamModalOpen}
        onClose={() => {
          setIsRemoveTeamModalOpen(false);
          setRemoveTeamData(null);
        }}
        onConfirm={handleRemoveTeam}
        title="Remove Team"
        message={`Are you sure you want to remove the team "${removeTeamData?.teamId?.name || "this team"}" from the project?`}
      />
    </div>
  );
};

export default ProjectSettingMembers;
