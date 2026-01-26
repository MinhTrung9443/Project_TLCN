import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { groupService, userService } from "../services/groupService";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import AddMemberModal from "../components/group/AddMemberModal";
import ConfirmationModal from "../components/common/ConfirmationModal";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { VscOrganization } from "react-icons/vsc";

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
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <Link to="/app/organization/group" className="flex items-center gap-1 hover:text-primary-600 transition-colors">
          <span className="material-symbols-outlined text-base">groups</span>
          <span>Teams</span>
        </Link>
        <span>/</span>
        <span className="text-neutral-900 font-medium">{group?.name || "Team Members"}</span>
      </div>

      <PageHeader
        icon={VscOrganization}
        title={group?.name || "Team Members"}
        description="Manage team members and their access"
        badge={{
          text: `${members.length} members`,
          variant: "neutral",
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card hoverable>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-100">
              <span className="material-symbols-outlined text-primary-600 text-2xl">group</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900">{members.length}</div>
              <div className="text-sm text-neutral-600">Total Members</div>
            </div>
          </div>
        </Card>
        <Card hoverable>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-success-100">
              <span className="material-symbols-outlined text-success-600 text-2xl">check_circle</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900">{members.filter((m) => m.status === "active").length}</div>
              <div className="text-sm text-neutral-600">Active</div>
            </div>
          </div>
        </Card>
        <Card hoverable>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-neutral-100">
              <span className="material-symbols-outlined text-neutral-600 text-2xl">cancel</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900">{members.filter((m) => m.status !== "active").length}</div>
              <div className="text-sm text-neutral-600">Inactive</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search members by name, username, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon="search"
            />
          </div>
          {isAdmin && (
            <Button onClick={handleOpenAddModal} icon="person_add" iconPosition="left">
              Add Member
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading members..." />
        </div>
      ) : (
        <div>
          {filteredMembers.length === 0 ? (
            <EmptyState icon="group_off" title="No members found" description="Try adjusting your search or add new members to this team" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMembers.map((member) => (
                <Card key={member._id} hoverable>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                      <span>{(member.fullname || "")[0] || "U"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-neutral-900 mb-2 truncate">{member.fullname}</h3>
                      <div className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                        <span className="material-symbols-outlined text-base">badge</span>
                        <span className="truncate">{member.username}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <span className="material-symbols-outlined text-base">email</span>
                        <span className="truncate">{member.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200">
                    <Badge variant={member.status === "active" ? "success" : "neutral"}>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        {member.status}
                      </span>
                    </Badge>
                    {isAdmin && (
                      <button
                        className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-error-50 text-error-600 transition-colors"
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
                </Card>
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
