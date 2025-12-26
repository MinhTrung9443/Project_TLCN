import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { groupService, userService } from "../services/groupService";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import AddMemberModal from "../components/group/AddMemberModal";
import ConfirmationModal from "../components/common/ConfirmationModal";
import "../styles/pages/GroupMembersPage.css";

const GroupMembersPage = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [members, setMembers] = useState([]);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [removeMemberData, setRemoveMemberData] = useState(null);
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

  const filteredMembers = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (m.fullname || "").toLowerCase().includes(q) ||
      (m.username || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q)
    );
  });

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
  const handleAddMember = async (userIdsToAdd) => {
    if (!userIdsToAdd || (Array.isArray(userIdsToAdd) && userIdsToAdd.length === 0)) {
      toast.warn("Please select at least one user to add.");
      return;
    }
    try {
      await groupService.addMemberToGroup(groupId, userIdsToAdd);
      const count = Array.isArray(userIdsToAdd) ? userIdsToAdd.length : 1;
      toast.success(`${count} member(s) added successfully!`);
      setIsAddModalOpen(false);
      fetchMembersAndGroup();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member(s).");
    }
  };

  const handleRemoveMember = async () => {
    try {
      await groupService.removeMemberFromGroup(groupId, removeMemberData.userId);
      toast.success("Member removed successfully!");
      fetchMembersAndGroup();
      setIsRemoveMemberModalOpen(false);
      setRemoveMemberData(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member.");
    }
  };

  return (
    <div className="member-page-container">
      <div className="member-page-header">
        <div className="breadcrumbs-and-stats">
          <h1 className="breadcrumbs">
            <Link to="/organization/group">Groups</Link> / <span>{group?.name || "Group Members"}</span>
          </h1>
          <div className="group-stats-inline">
            <div className="chip total">
              <strong>{members.length}</strong>
              <span>Total</span>
            </div>
            <div className="chip active">
              <strong>{members.filter((m) => m.status === "active").length}</strong>
              <span>Active</span>
            </div>
            <div className="chip inactive">
              <strong>{members.filter((m) => m.status !== "active").length}</strong>
              <span>Inactive</span>
            </div>
          </div>
        </div>

        <div className="header-controls">
          <input
            className="search-pill"
            placeholder="Search members by name, username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isAdmin && (
            <button onClick={handleOpenAddModal} className="add-member-button">
              ADD MEMBER
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="members-card">
          {filteredMembers.length === 0 ? (
            <div className="no-members-message">No members found.</div>
          ) : (
            <div className="members-list">
              {filteredMembers.map((member) => (
                <div className="member-row" key={member._id}>
                  <div className="member-left">
                    <div className="avatar">{(member.fullname || "")[0] || "U"}</div>
                    <div className="meta">
                      <div className="name">{member.fullname}</div>
                      <div className="sub">{member.username} • {member.email}</div>
                    </div>
                  </div>
                  <div className="member-right">
                    <div className={`status-pill ${member.status === "active" ? "active" : "inactive"}`}>{member.status}</div>
                    {isAdmin && (
                      <button
                        className="remove-member-btn"
                        onClick={() => {
                          setRemoveMemberData({ userId: member._id, userName: member.fullname });
                          setIsRemoveMemberModalOpen(true);
                        }}
                        title="Remove member from group"
                      >
                        <span className="material-symbols-outlined">person_remove</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMember}
        users={allUsers.filter((u) => !members.some((m) => m._id === u._id))}
      />

      <ConfirmationModal
        isOpen={isRemoveMemberModalOpen}
        onClose={() => {
          setIsRemoveMemberModalOpen(false);
          setRemoveMemberData(null);
        }}
        onConfirm={handleRemoveMember}
        title="Remove Member from Group"
        message={`Are you sure you want to remove ${removeMemberData?.userName || "this member"} from this group?`}
      />
    </div>
  );
};

export default GroupMembersPage;
