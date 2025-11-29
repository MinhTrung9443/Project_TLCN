import React, { useState, useEffect, useCallback } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import userService from "../../services/userService";
import { groupService } from "../../services/groupService";
import { addMemberToProject, addMembersFromGroupToProject } from "../../services/projectService";
import "../../styles/pages/ManageProject/AddMemberModal.css";

const AddMemberModal = ({ isOpen, onClose, projectKey, onMemberAdded, existingMemberIds = [], existingTeamIds = [] }) => {
  const [addMode, setAddMode] = useState("individual");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("MEMBER");
  const [selectedUserTeam, setSelectedUserTeam] = useState(null); // Team được chọn cho user (nếu user thuộc nhiều team)
  const [selectedTemporaryGroup, setSelectedTemporaryGroup] = useState(null); // Group tạm thời cho user không thuộc group nào
  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState(new Set());
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [usersRes, groupsRes] = await Promise.all([userService.getUsers({ status: "active" }), groupService.getGroups()]);

      // Xử lý đúng cấu trúc dữ liệu trả về
      const usersData = Array.isArray(usersRes) ? usersRes : usersRes.data || [];
      const groupsData = Array.isArray(groupsRes.data.data) ? groupsRes.data.data : [];

      setAllUsers(usersData);
      setAllGroups(groupsData);
    } catch (error) {
      console.error("Failed to load initial data:", error);
      toast.error("Failed to load initial data.");
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Fetch dữ liệu khi modal được mở
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  useEffect(() => {
    if (selectedGroup) {
      const group = allGroups.find((g) => g._id === selectedGroup.value);
      if (group && group.members) {
        // Lọc bỏ những người đã có trong project (kiểm tra cả trong members array)
        const membersOfGroup = allUsers.filter((u) => {
          // Phải thuộc group
          const belongsToGroup = group.members.includes(u._id);
          // Chưa có trong project
          const notInProject = !existingMemberIds.includes(u._id);
          return belongsToGroup && notInProject;
        });

        setTeamMembers(membersOfGroup);
        // Mặc định chọn tất cả members chưa có trong project
        setSelectedTeamMemberIds(new Set(membersOfGroup.map((m) => m._id)));
      }
      setSelectedLeader(null);
    } else {
      setTeamMembers([]);
      setSelectedTeamMemberIds(new Set());
    }
  }, [selectedGroup, allGroups, allUsers, existingMemberIds]);

  const handleTeamMemberToggle = (memberId) => {
    const newSelection = new Set(selectedTeamMemberIds);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedTeamMemberIds(newSelection);
  };

  useEffect(() => {
    if (selectedLeader && !selectedTeamMemberIds.has(selectedLeader.value)) {
      setSelectedLeader(null);
    }
  }, [selectedTeamMemberIds, selectedLeader]);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      if (addMode === "individual") {
        if (!selectedUser || !selectedRole) {
          toast.warn("Please select a user and a role.");
          setIsSaving(false);
          return;
        }

        // Kiểm tra nếu user thuộc nhiều team nhưng chưa chọn team
        if (userTeamOptions.length > 1 && !selectedUserTeam) {
          toast.warn("This user belongs to multiple teams. Please select a team.");
          setIsSaving(false);
          return;
        }

        // Kiểm tra nếu user không thuộc team nào nhưng chưa chọn temporary group
        if (userTeamOptions.length === 0 && !selectedTemporaryGroup) {
          toast.warn("This user is not in any team. Please select a temporary group for this project.");
          setIsSaving(false);
          return;
        }

        // Xác định teamId để gửi
        let teamIdToSend = null;
        if (userTeamOptions.length === 1) {
          // User chỉ thuộc 1 team, tự động lấy team đó
          teamIdToSend = userTeamOptions[0].value;
        } else if (userTeamOptions.length > 1 && selectedUserTeam) {
          // User thuộc nhiều team và đã chọn team
          teamIdToSend = selectedUserTeam.value;
        } else if (userTeamOptions.length === 0 && selectedTemporaryGroup) {
          // User không thuộc team nào, dùng temporary group được chọn
          teamIdToSend = selectedTemporaryGroup.value;
        }

        await addMemberToProject(projectKey, {
          userId: selectedUser.value,
          role: selectedRole,
          teamId: teamIdToSend,
        });
        toast.success("Member added successfully!");
      } else if (addMode === "team") {
        if (!selectedGroup) {
          toast.warn("Please select a team.");
          setIsSaving(false);
          return;
        }

        if (teamMembers.length === 0) {
          toast.warn("All members from this team are already in the project.");
          setIsSaving(false);
          return;
        }

        if (!selectedLeader) {
          toast.warn("Please select a leader for the team.");
          setIsSaving(false);
          return;
        }

        if (selectedTeamMemberIds.size === 0) {
          toast.warn("Please select at least one member to add from the team.");
          setIsSaving(false);
          return;
        }

        await addMembersFromGroupToProject(projectKey, {
          groupId: selectedGroup.value,
          leaderId: selectedLeader.value,
          memberIds: Array.from(selectedTeamMemberIds),
        });
        toast.success("Team members added successfully!");
      }
      onMemberAdded();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setAddMode("individual");
    setSelectedUser(null);
    setSelectedRole("MEMBER");
    setSelectedUserTeam(null);
    setSelectedTemporaryGroup(null);
    setSelectedGroup(null);
    setSelectedLeader(null);
    setTeamMembers([]);
    setSelectedTeamMemberIds(new Set());
    onClose();
  };

  if (!isOpen) return null;

  // Tạo userOptions với thông tin team
  const userOptions = allUsers
    .filter((u) => !existingMemberIds.includes(u._id))
    .map((u) => {
      // Tìm tất cả các groups mà user này thuộc về
      const userGroups = allGroups.filter((g) => g.members && g.members.includes(u._id));
      const groupNames = userGroups.map((g) => g.name).join(", ");

      return {
        value: u._id,
        label: `${u.fullname || u.username}${groupNames ? ` (${groupNames})` : " (No team)"}`,
        userGroups: userGroups,
        userData: u,
      };
    });

  // Khi user được chọn, kiểm tra xem họ thuộc bao nhiêu team
  const selectedUserData = selectedUser ? userOptions.find((opt) => opt.value === selectedUser.value) : null;
  const userTeamOptions = selectedUserData?.userGroups?.map((g) => ({ value: g._id, label: g.name })) || [];

  const groupOptions = allGroups.map((g) => ({ value: g._id, label: g.name }));

  const groupOptionsForTeamMode = allGroups
    .filter((g) => !existingTeamIds.includes(g._id)) // Lọc ra các team đã có trong dự án
    .map((g) => ({ value: g._id, label: g.name }));

  const leaderOptions = teamMembers.filter((m) => selectedTeamMemberIds.has(m._id)).map((u) => ({ value: u._id, label: u.fullname || u.username }));

  return (
    <div className="modal-overlay">
      <div className="modal-content add-member-modal">
        <h2>Add people to project</h2>
        <div className="add-mode-toggle">
          <button className={`toggle-button ${addMode === "individual" ? "active" : ""}`} onClick={() => setAddMode("individual")}>
            Add Individual
          </button>
          <button className={`toggle-button ${addMode === "team" ? "active" : ""}`} onClick={() => setAddMode("team")}>
            Add Team
          </button>
        </div>

        <div className="form-content">
          {addMode === "individual" && (
            <>
              <div className="form-group">
                <label>Select a user</label>
                <Select
                  options={userOptions}
                  value={selectedUser}
                  onChange={(option) => {
                    setSelectedUser(option);
                    // Reset team selection khi đổi user
                    setSelectedUserTeam(null);
                    setSelectedTemporaryGroup(null);
                  }}
                  isLoading={isLoadingData}
                />
              </div>

              {selectedUser && userTeamOptions.length > 1 && (
                <div className="form-group">
                  <label>User belongs to multiple teams - Select team for this project</label>
                  <Select options={userTeamOptions} value={selectedUserTeam} onChange={setSelectedUserTeam} placeholder="Select team..." />
                  <small className="form-hint">This user will be added to the project under the selected team.</small>
                </div>
              )}

              {selectedUser && userTeamOptions.length === 1 && (
                <div className="form-group">
                  <label>Team</label>
                  <input
                    type="text"
                    value={userTeamOptions[0].label}
                    disabled
                    className="form-control"
                    style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                  />
                </div>
              )}

              {selectedUser && userTeamOptions.length === 0 && (
                <div className="form-group">
                  <label>Temporary Group (This user is not in any team)</label>
                  <Select
                    options={groupOptions}
                    value={selectedTemporaryGroup}
                    onChange={setSelectedTemporaryGroup}
                    placeholder="Select a group for this project..."
                  />
                  <small className="form-hint">This user will be temporarily assigned to the selected group in this project.</small>
                </div>
              )}

              <div className="form-group">
                <label>Role</label>
                <Select
                  options={[
                    { value: "MEMBER", label: "Member" },
                    { value: "LEADER", label: "Leader" },
                  ]}
                  value={{ value: selectedRole, label: selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1).toLowerCase() }}
                  onChange={(option) => setSelectedRole(option.value)}
                />
              </div>
            </>
          )}

          {addMode === "team" && (
            <>
              <div className="form-group">
                <label>Select a Team</label>
                <Select options={groupOptionsForTeamMode} value={selectedGroup} onChange={setSelectedGroup} isLoading={isLoadingData} />
              </div>

              {selectedGroup && teamMembers.length === 0 && (
                <div className="form-group">
                  <p className="text-warning">⚠️ All members from this team are already in the project.</p>
                </div>
              )}

              {selectedGroup && teamMembers.length > 0 && (
                <div className="form-group member-selection-list">
                  <label>Select members to add ({teamMembers.length} available)</label>
                  <div className="checkbox-list-container">
                    {teamMembers.map((member) => {
                      // Kiểm tra xem member này có thuộc nhiều team không
                      const memberGroups = allGroups.filter((g) => g.members && g.members.includes(member._id));
                      const otherGroups = memberGroups.filter((g) => g._id !== selectedGroup.value);

                      return (
                        <div key={member._id} className="checkbox-item">
                          <input
                            type="checkbox"
                            id={`member-${member._id}`}
                            checked={selectedTeamMemberIds.has(member._id)}
                            onChange={() => handleTeamMemberToggle(member._id)}
                          />
                          <label htmlFor={`member-${member._id}`}>
                            <img src={member.avatar || "/default-avatar.png"} alt={member.fullname} className="item-avatar" />
                            <div className="member-info">
                              <span className="member-name">{member.fullname || member.username}</span>
                              {otherGroups.length > 0 && (
                                <small className="member-other-teams">Also in: {otherGroups.map((g) => g.name).join(", ")}</small>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedGroup && teamMembers.length > 0 && (
                <div className="form-group">
                  <label>Select a Leader (from selected members)</label>
                  <Select options={leaderOptions} value={selectedLeader} onChange={setSelectedLeader} isDisabled={leaderOptions.length === 0} />
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={handleClose} className="btn btn-secondary" disabled={isSaving}>
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={isSaving}>
            {isSaving ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
