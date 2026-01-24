import React, { useState, useEffect } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import userService from "../../services/userService";
import { addMemberToTeamInProject } from "../../services/projectService";
import "../../styles/components/AddMemberToTeamModal.css";

const AddMemberToTeamModal = ({ isOpen, onClose, projectKey, team, onMemberAdded, existingMemberIds = [] }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch danh sách tất cả user
  useEffect(() => {
    if (isOpen) {
      userService
        .getUsers({ status: "active" })
        .then((res) => {
          const usersData = Array.isArray(res) ? res : res.data || [];
          setAllUsers(usersData);
        })
        .catch(() => toast.error("Failed to load user list."));
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.warn("Please select a user to add.");
      return;
    }
    setIsLoading(true);
    try {
      await addMemberToTeamInProject(projectKey, team.teamId._id, { userId: selectedUser.value });
      toast.success("Member added to team successfully!");
      onMemberAdded(); // Báo cho cha để refresh
      onClose(); // Đóng modal
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member to team.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const userOptions = allUsers.filter((u) => !existingMemberIds.includes(u._id)).map((u) => ({ value: u._id, label: u.fullname || u.username }));

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add Member to "{team?.teamId?.name}"</h2>
        <div className="form-group">
          <label>Select a user</label>
          <Select
            options={userOptions}
            value={selectedUser}
            onChange={setSelectedUser}
            placeholder="Search for a user to add..."
            menuPortalTarget={document.body}
            styles={{
              menuPortal: (base) => ({ ...base, zIndex: 99999 }),
              control: (base) => ({
                ...base,
                fontFamily: '"Poppins", sans-serif',
                borderRadius: "8px",
                border: "2px solid #e9ecef",
                "&:hover": { borderColor: "#6f42c1" },
              }),
            }}
          />
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary" disabled={isLoading}>
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={isLoading}>
            {isLoading ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberToTeamModal;
