import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { groupService, userService } from "../services/groupService";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import AddMemberModal from "../components/group/AddMemberModal";
import "../styles/pages/GroupMembersPage.css";

const GroupMembersPage = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [members, setMembers] = useState([]);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  const fetchMembersAndGroup = useCallback(async () => {
    try {
      setLoading(true);

      const [membersResponse, groupResponse] = await Promise.all([groupService.getGroupMembers(groupId), groupService.getGroupById(groupId)]);

      setMembers(membersResponse.data.data);
      setGroup(groupResponse.data.data);
    } catch (error) {
      toast.error("Failed to fetch page data.");
      console.error("Error fetching members and group details:", error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMembersAndGroup();
  }, [fetchMembersAndGroup]);

  const handleOpenAddModal = async () => {
    console.log("Opening Add Member modal...");
    try {
      const response = await userService.getUsers({ status: "active" });
      setAllUsers(response.data.data);
      setIsAddModalOpen(true);
    } catch (error) {
      toast.error("Failed to fetch users list.");
    }
  };
  const handleAddMember = async (userIdToAdd) => {
    if (!userIdToAdd) {
      toast.warn("Please select a user to add.");
      return;
    }
    try {
      await groupService.addMemberToGroup(groupId, userIdToAdd);
      toast.success("Member added successfully!");
      setIsAddModalOpen(false);
      fetchMembersAndGroup();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member.");
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove ${userName} from this group?`)) {
      return;
    }
    try {
      await groupService.removeMemberFromGroup(groupId, userId);
      toast.success("Member removed successfully!");
      fetchMembersAndGroup();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member.");
    }
  };

  return (
    <div className="member-page-container">
      <div className="member-page-header">
        <h1 className="breadcrumbs">
          <Link to="/organization/group">Groups</Link> / <span>{group?.name || "Group Members"}</span>
        </h1>
        {isAdmin && (
          <button onClick={handleOpenAddModal} className="add-member-button">
            ADD MEMBER
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="members-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Gender</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length > 0 ? (
              members.map((member) => (
                <tr key={member._id}>
                  <td>{member.fullname}</td>
                  <td>{member.username}</td>
                  <td>{member.email}</td>
                  <td>{member.phone}</td>
                  <td>{member.gender}</td>
                  <td>
                    <label className="switch">
                      <input type="checkbox" checked={member.status === "active"} disabled={!isAdmin} />
                      <span className="slider"></span>
                    </label>
                  </td>
                  <td>
                    {isAdmin && (
                      <button
                        className="remove-member-btn"
                        onClick={() => handleRemoveMember(member._id, member.fullname)}
                        title="Remove member from group"
                      >
                        <span className="material-symbols-outlined">person_remove</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-members-message">
                  No data to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMember}
        users={allUsers.filter((u) => !members.some((m) => m._id === u._id))}
      />
    </div>
  );
};

export default GroupMembersPage;
