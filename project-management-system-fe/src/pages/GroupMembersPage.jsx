import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { groupService, userService } from "../services/groupService";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import AddMemberModal from "../components/group/AddMemberModal";
import ConfirmationModal from "../components/common/ConfirmationModal";

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
    return (m.fullname || "").toLowerCase().includes(q) || (m.username || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-8 mb-8 shadow-lg">
        <div className="flex items-center gap-2 text-purple-100 mb-4">
          <Link to="/app/organization/group" className="flex items-center gap-1 hover:text-white transition-colors">
            <span className="material-symbols-outlined">groups</span>
            <span>Teams</span>
          </Link>
          <span>/</span>
          <span className="text-white font-medium">{group?.name || "Team Members"}</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-6">{group?.name || "Team Members"}</h1>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-3 bg-white bg-opacity-20 rounded-lg px-4 py-3">
            <span className="material-symbols-outlined text-white text-2xl">group</span>
            <div className="text-white">
              <div className="text-2xl font-bold">{members.length}</div>
              <div className="text-sm text-purple-100">Total Members</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white bg-opacity-20 rounded-lg px-4 py-3">
            <span className="material-symbols-outlined text-white text-2xl">check_circle</span>
            <div className="text-white">
              <div className="text-2xl font-bold">{members.filter((m) => m.status === "active").length}</div>
              <div className="text-sm text-purple-100">Active</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white bg-opacity-20 rounded-lg px-4 py-3">
            <span className="material-symbols-outlined text-white text-2xl">cancel</span>
            <div className="text-white">
              <div className="text-2xl font-bold">{members.filter((m) => m.status !== "active").length}</div>
              <div className="text-sm text-purple-100">Inactive</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1 max-w-md relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Search members by name, username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">person_add</span>
            Add Member
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 text-sm font-medium">Loading members...</p>
        </div>
      ) : (
        <div>
          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">group_off</span>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No members found</h3>
              <p className="text-gray-600">Try adjusting your search or add new members to this team</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMembers.map((member) => (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-6" key={member._id}>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                      <span>{(member.fullname || "")[0] || "U"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{member.fullname}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <span className="material-symbols-outlined text-base">badge</span>
                        <span className="truncate">{member.username}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="material-symbols-outlined text-base">email</span>
                        <span className="truncate">{member.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full ${
                        member.status === "active" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      {member.status}
                    </span>
                    {isAdmin && (
                      <button
                        className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
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
