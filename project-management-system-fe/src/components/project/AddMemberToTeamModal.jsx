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
      <div className="modal-content add-member-to-team-modal">
        <div className="modal-header-modern">
          <div className="modal-icon-wrapper">
            <span className="material-symbols-outlined">group_add</span>
          </div>
          <h2 className="modal-title-modern">Add Member to "{team?.teamId?.name}"</h2>
          <p className="modal-subtitle">Choose a user to join this team in the project</p>
        </div>
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
        <div className="modal-actions-modern">
          <button onClick={onClose} className="btn-modern btn-secondary-modern" disabled={isLoading}>
            <span className="material-symbols-outlined">close</span>
            <span>Cancel</span>
          </button>
          <button onClick={handleSubmit} className="btn-modern btn-primary-modern" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner-modern"></span>
                <span>Adding...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">person_add</span>
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberToTeamModal;
