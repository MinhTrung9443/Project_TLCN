import React, { useState, useEffect, useCallback } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import userService from "../../services/userService";
import { groupService } from "../../services/groupService";
import { addMemberToProject, addMembersFromGroupToProject } from "../../services/projectService";

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
      const [usersRes, groupsRes] = await Promise.all([userService.getUsers({ status: "active" }), groupService.getGroups({ status: "active" })]);

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
          // Không phải admin
          const notAdmin = u.role !== "admin";
          return belongsToGroup && notInProject && notAdmin;
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

        if (selectedTeamMemberIds.size === 0) {
          toast.warn("Please select at least one member to add from the team.");
          setIsSaving(false);
          return;
        }

        // Leader là optional - nếu không chọn, backend sẽ tự động tìm member có role LEADER trong project

        const response = await addMembersFromGroupToProject(projectKey, {
          groupId: selectedGroup.value,
          leaderId: selectedLeader?.value || null,
          memberIds: Array.from(selectedTeamMemberIds),
        });

        // Kiểm tra nếu có conflict về leader
        if (response.data?.hasLeaderConflict) {
          toast.warning(
            response.data.message || "This team already has a leader. If you want to change the leader, please use the 'Change Leader' option.",
          );
        } else {
          toast.success("Team members added successfully!");
        }
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
    .filter((u) => u.role !== "admin") // Lọc bỏ admin
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
    .filter((g) => g.status === "active") // Chỉ lấy group đang active
    .filter((g) => {
      // Kiểm tra xem team này còn thành viên chưa join project không
      const teamMembersNotInProject = allUsers.filter((u) => {
        const belongsToGroup = g.members && g.members.includes(u._id);
        const notInProject = !existingMemberIds.includes(u._id);
        const notAdmin = u.role !== "admin";
        return belongsToGroup && notInProject && notAdmin;
      });
      return teamMembersNotInProject.length > 0; // Chỉ hiển thị team còn member chưa join
    })
    .map((g) => ({ value: g._id, label: g.name }));

  const leaderOptions = teamMembers.filter((m) => selectedTeamMemberIds.has(m._id)).map((u) => ({ value: u._id, label: u.fullname || u.username }));

  return (
    <div className="modal-overlay">
      <div className="modal-content add-member-modal">
        <div className="modal-header-modern">
          <div className="modal-icon-wrapper">
            <span className="material-symbols-outlined">group_add</span>
          </div>
          <h2 className="modal-title-modern">Add People to Project</h2>
          <p className="modal-subtitle">Invite team members or groups to collaborate on this project</p>
        </div>

        <div className="add-mode-toggle-modern">
          <button className={`toggle-button-modern ${addMode === "individual" ? "active" : ""}`} onClick={() => setAddMode("individual")}>
            <span className="material-symbols-outlined">person_add</span>
            <span>Individual</span>
          </button>
          <button className={`toggle-button-modern ${addMode === "team" ? "active" : ""}`} onClick={() => setAddMode("team")}>
            <span className="material-symbols-outlined">groups</span>
            <span>Team</span>
          </button>
        </div>

        <div className="form-content-modern">
          {addMode === "individual" && (
            <>
              <div className="form-group-modern">
                <label className="form-label-modern">
                  <span className="material-symbols-outlined">person_search</span>
                  Select a User
                </label>
                <Select
                  options={userOptions}
                  value={selectedUser}
                  onChange={(option) => {
                    setSelectedUser(option);
                    setSelectedUserTeam(null);
                    setSelectedTemporaryGroup(null);
                  }}
                  isLoading={isLoadingData}
                  placeholder="Search for a user..."
                  menuPortalTarget={document.body}
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    control: (base, state) => ({
                      ...base,
                      fontFamily: '"Poppins", sans-serif',
                      borderRadius: "10px",
                      border: state.isFocused ? "2px solid #6f42c1" : "2px solid #e9ecef",
                      boxShadow: state.isFocused ? "0 0 0 3px rgba(111, 66, 193, 0.1)" : "none",
                      "&:hover": { borderColor: "#6f42c1" },
                      padding: "4px",
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? "#6f42c1" : state.isFocused ? "#f3efff" : "white",
                      color: state.isSelected ? "white" : "#212529",
                      fontFamily: '"Poppins", sans-serif',
                      padding: "10px 12px",
                      cursor: "pointer",
                    }),
                  }}
                  formatOptionLabel={(option) => (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {option.userData?.avatar ? (
                        <img
                          src={option.userData.avatar}
                          alt={option.label}
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #e9ecef",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #6f42c1 0%, #4a40c9 100%)",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "15px",
                            fontWeight: "700",
                            border: "2px solid #e9ecef",
                          }}
                        >
                          {(option.userData?.fullname || option.userData?.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span style={{ fontSize: "14px", fontWeight: "500" }}>{option.label}</span>
                    </div>
                  )}
                />
              </div>

              {selectedUser && userTeamOptions.length > 1 && (
                <div className="form-group-modern info-card">
                  <div className="info-card-header">
                    <span className="material-symbols-outlined">info</span>
                    <span>Multiple Team Membership</span>
                  </div>
                  <label className="form-label-modern">Select Team for This Project</label>
                  <Select
                    options={userTeamOptions}
                    value={selectedUserTeam}
                    onChange={setSelectedUserTeam}
                    placeholder="Choose a team..."
                    menuPortalTarget={document.body}
                    styles={{
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      control: (base, state) => ({
                        ...base,
                        fontFamily: '"Poppins", sans-serif',
                        borderRadius: "10px",
                        border: state.isFocused ? "2px solid #6f42c1" : "2px solid #e9ecef",
                        boxShadow: state.isFocused ? "0 0 0 3px rgba(111, 66, 193, 0.1)" : "none",
                        "&:hover": { borderColor: "#6f42c1" },
                        padding: "4px",
                      }),
                    }}
                  />
                  <small className="form-hint-modern">
                    <span className="material-symbols-outlined">lightbulb</span>
                    This user will be added under the selected team
                  </small>
                </div>
              )}

              {selectedUser && userTeamOptions.length === 1 && (
                <div className="form-group-modern">
                  <label className="form-label-modern">
                    <span className="material-symbols-outlined">group</span>
                    Team Assignment
                  </label>
                  <div className="static-field">
                    <span className="material-symbols-outlined">check_circle</span>
                    <span>{userTeamOptions[0].label}</span>
                  </div>
                </div>
              )}

              {selectedUser && userTeamOptions.length === 0 && (
                <div className="form-group-modern warning-card">
                  <div className="warning-card-header">
                    <span className="material-symbols-outlined">warning</span>
                    <span>No Team Assignment</span>
                  </div>
                  <label className="form-label-modern">Select Temporary Group</label>
                  <Select
                    options={groupOptions}
                    value={selectedTemporaryGroup}
                    onChange={setSelectedTemporaryGroup}
                    placeholder="Choose a group for this project..."
                    menuPortalTarget={document.body}
                    styles={{
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      control: (base, state) => ({
                        ...base,
                        fontFamily: '"Poppins", sans-serif',
                        borderRadius: "10px",
                        border: state.isFocused ? "2px solid #6f42c1" : "2px solid #e9ecef",
                        boxShadow: state.isFocused ? "0 0 0 3px rgba(111, 66, 193, 0.1)" : "none",
                        "&:hover": { borderColor: "#6f42c1" },
                        padding: "4px",
                      }),
                    }}
                  />
                  <small className="form-hint-modern">
                    <span className="material-symbols-outlined">lightbulb</span>
                    User will be temporarily assigned to this group in the project
                  </small>
                </div>
              )}
            </>
          )}

          {addMode === "team" && (
            <>
              <div className="form-group-modern">
                <label className="form-label-modern">
                  <span className="material-symbols-outlined">groups</span>
                  Select a Team
                </label>
                <Select
                  options={groupOptionsForTeamMode}
                  value={selectedGroup}
                  onChange={setSelectedGroup}
                  isLoading={isLoadingData}
                  placeholder="Choose a team to add..."
                  menuPortalTarget={document.body}
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    control: (base, state) => ({
                      ...base,
                      fontFamily: '"Poppins", sans-serif',
                      borderRadius: "10px",
                      border: state.isFocused ? "2px solid #6f42c1" : "2px solid #e9ecef",
                      boxShadow: state.isFocused ? "0 0 0 3px rgba(111, 66, 193, 0.1)" : "none",
                      "&:hover": { borderColor: "#6f42c1" },
                      padding: "4px",
                    }),
                  }}
                />
              </div>

              {selectedGroup && teamMembers.length === 0 && (
                <div className="alert-card warning">
                  <span className="material-symbols-outlined">info</span>
                  <p>All members from this team are already in the project</p>
                </div>
              )}

              {selectedGroup && teamMembers.length > 0 && (
                <div className="form-group-modern">
                  <label className="form-label-modern">
                    <span className="material-symbols-outlined">how_to_reg</span>
                    Select Members to Add
                    <span className="member-count-badge">{teamMembers.length} available</span>
                  </label>
                  <div className="member-selection-grid">
                    {teamMembers.map((member) => {
                      const memberGroups = allGroups.filter((g) => g.members && g.members.includes(member._id));
                      const otherGroups = memberGroups.filter((g) => g._id !== selectedGroup.value);

                      return (
                        <label key={member._id} className="member-card-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedTeamMemberIds.has(member._id)}
                            onChange={() => handleTeamMemberToggle(member._id)}
                          />
                          <div className="member-card-content">
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.fullname} className="member-avatar-modern" />
                            ) : (
                              <div className="member-avatar-modern member-avatar-placeholder">
                                {(member.fullname || member.username || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="member-details">
                              <span className="member-name-modern">{member.fullname || member.username}</span>
                              {otherGroups.length > 0 && (
                                <small className="member-teams-badge">
                                  <span className="material-symbols-outlined">groups</span>
                                  {otherGroups.map((g) => g.name).join(", ")}
                                </small>
                              )}
                            </div>
                            <span className="checkmark-indicator">
                              <span className="material-symbols-outlined">check_circle</span>
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedGroup && teamMembers.length > 0 && (
                <div className="form-group-modern">
                  <label className="form-label-modern">
                    <span className="material-symbols-outlined">workspace_premium</span>
                    Select Team Leader (Optional)
                  </label>
                  <Select
                    options={leaderOptions}
                    value={selectedLeader}
                    onChange={setSelectedLeader}
                    isDisabled={leaderOptions.length === 0}
                    isClearable={true}
                    placeholder="Auto-detect or choose manually..."
                    menuPortalTarget={document.body}
                    styles={{
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      control: (base, state) => ({
                        ...base,
                        fontFamily: '"Poppins", sans-serif',
                        borderRadius: "10px",
                        border: state.isFocused ? "2px solid #6f42c1" : "2px solid #e9ecef",
                        boxShadow: state.isFocused ? "0 0 0 3px rgba(111, 66, 193, 0.1)" : "none",
                        "&:hover": { borderColor: "#6f42c1" },
                        padding: "4px",
                      }),
                    }}
                  />
                  <small className="form-hint-modern">
                    <span className="material-symbols-outlined">lightbulb</span>
                    System will auto-detect existing leader if not specified
                  </small>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-actions-modern">
          <button onClick={handleClose} className="btn-modern btn-secondary-modern" disabled={isSaving}>
            <span className="material-symbols-outlined">close</span>
            <span>Cancel</span>
          </button>
          <button onClick={handleSubmit} className="btn-modern btn-primary-modern" disabled={isSaving}>
            {isSaving ? (
              <>
                <span className="spinner-modern"></span>
                <span>Adding...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">group_add</span>
                <span>Add to Project</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
