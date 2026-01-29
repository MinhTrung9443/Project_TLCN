import React, { useCallback, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
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
import MemberActionsMenu from "../../components/project/MemberActionsMenu";
import AddMemberToTeamModal from "../../components/project/AddMemberToTeamModal";

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
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" text="Loading members..." />
      </div>
    );
  }

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
      await removeTeamFromProject(projectKey, removeTeamData.team.teamId._id);
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
    <div className="bg-white p-7 border border-neutral-200 rounded-xl shadow-sm">
      <div className="flex justify-between items-start pb-5 mb-6 border-b-2 border-primary-100">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-blue-900 m-0">Project Members</h2>
          <p className="text-neutral-600 text-sm mt-1">Manage teams, roles, and collaborators for this project</p>
        </div>
        {canManageMembers && (
          <div className="flex gap-3">
            <Button icon="group_add" onClick={() => setIsAddModalOpen(true)}>
              Add People / Team
            </Button>
          </div>
        )}
      </div>

      {/* Hiển thị thông tin PM */}
      {projectManager && (
        <div className="mb-7 pb-7 border-b-2 border-purple-100">
          <h3 className="text-lg font-bold text-blue-900 mb-5 m-0">Project Manager</h3>
          <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-neutral-50 to-white rounded-xl border-2 border-neutral-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            {projectManager.userId.avatar ? (
              <img
                src={projectManager.userId.avatar}
                alt=""
                className="w-16 h-16 rounded-full object-cover border-2 border-neutral-200 flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 text-white flex items-center justify-center text-2xl font-bold flex-shrink-0 shadow-md">
                {(projectManager.userId.fullname || projectManager.userId.username || "PM").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <div className="text-xl font-bold text-blue-900">{projectManager.userId.fullname}</div>
              <div className="text-neutral-600">{projectManager.userId.email}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col">
        <div className="grid grid-cols-[3fr_1.5fr_1.5fr_50px] items-center gap-5 px-6 py-4 border-b border-neutral-200 text-xs font-medium uppercase tracking-wider text-neutral-600">
          <div>Member / Team</div>
          <div>Role</div>
          <div>Source</div>
          <div>Actions</div>
        </div>

        {displayList.map((item) => {
          if (item.isTeam) {
            return (
              <React.Fragment key={item.team.teamId._id}>
                <div className="grid grid-cols-[3fr_1.5fr_1.5fr_50px] items-center gap-5 px-6 py-4 border-b border-neutral-100 bg-neutral-50 hover:bg-neutral-100 font-bold">
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
                  <div className="grid grid-cols-[3fr_1.5fr_1.5fr_50px] items-center gap-5 px-6 py-4 pl-12 border-b border-neutral-100 hover:bg-neutral-50">
                    <div className="flex items-center gap-3">
                      {item.leader.userId.avatar ? (
                        <img src={item.leader.userId.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-primary-700 text-white flex items-center justify-center text-sm font-semibold">
                          {(item.leader.userId.fullname || item.leader.userId.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-neutral-900">{item.leader.userId.fullname}</span>
                      {item.leader.userId.status === "inactive" && (
                        <span className="inline-block bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs font-semibold uppercase">
                          <span className="inline-block w-1.5 h-1.5 bg-red-700 rounded-full mr-1.5 align-middle"></span>Deactivated
                        </span>
                      )}
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
                  <div
                    className="grid grid-cols-[3fr_1.5fr_1.5fr_50px] items-center gap-5 px-6 py-4 pl-12 border-b border-neutral-100 hover:bg-neutral-50"
                    key={member.userId._id}
                  >
                    <div className="flex items-center gap-3">
                      {member.userId.avatar ? (
                        <img src={member.userId.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-primary-700 text-white flex items-center justify-center text-sm font-semibold">
                          {(member.userId.fullname || member.userId.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-neutral-900">{member.userId.fullname}</span>
                      {member.userId.status === "inactive" && (
                        <span className="inline-block bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs font-semibold uppercase">
                          <span className="inline-block w-1.5 h-1.5 bg-red-700 rounded-full mr-1.5 align-middle"></span>Deactivated
                        </span>
                      )}
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
              <div
                className={`grid grid-cols-[3fr_1.5fr_1.5fr_50px] items-center gap-5 px-6 py-4 border-b border-gray-100 ${item.role === "PROJECT_MANAGER" ? "font-semibold bg-white" : "hover:bg-gray-50"}`}
                key={item.userId._id}
              >
                <div className="flex items-center gap-3">
                  {item.userId.avatar ? (
                    <img src={item.userId.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-primary-700 text-white flex items-center justify-center text-sm font-semibold">
                      {(item.userId.fullname || item.userId.username || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-neutral-900">{item.userId.fullname}</span>
                  {item.role === "PROJECT_MANAGER" && (
                    <span className="inline-block bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-semibold uppercase">PM</span>
                  )}
                  {item.userId.status === "inactive" && (
                    <span className="inline-block bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs font-semibold uppercase">
                      <span className="inline-block w-1.5 h-1.5 bg-red-700 rounded-full mr-1.5 align-middle"></span>Deactivated
                    </span>
                  )}
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
        {displayList.length === 0 && <div className="py-8 text-center text-neutral-500">No members in this project yet.</div>}
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
