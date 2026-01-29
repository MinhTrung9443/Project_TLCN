import React, { useState, useEffect } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import userService from "../../services/userService";
import { addMemberToTeamInProject } from "../../services/projectService";

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-neutral-200">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mb-4">
            <span className="material-symbols-outlined">group_add</span>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">Add Member to "{team?.teamId?.name}"</h2>
          <p className="text-sm text-neutral-600 mt-2">Choose a user to join this team in the project</p>
        </div>
        <div className="p-6">
          <label className="block text-sm font-semibold text-neutral-900 mb-2">Select a user</label>
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
                border: state.isFocused ? "2px solid #7c3aed" : "2px solid #e5e7eb",
                boxShadow: state.isFocused ? "0 0 0 3px rgba(124, 58, 237, 0.1)" : "none",
                "&:hover": { borderColor: "#7c3aed" },
                padding: "4px",
              }),
            }}
          />
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-white font-medium transition-colors"
            disabled={isLoading}
          >
            <span className="material-symbols-outlined text-lg">close</span>
            <span>Cancel</span>
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-300 border-t-white rounded-full animate-spin"></div>
                <span>Adding...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">person_add</span>
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
