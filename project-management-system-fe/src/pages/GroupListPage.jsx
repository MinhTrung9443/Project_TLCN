import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import CreateEditGroupModal from "../components/group/CreateEditGroupModal";
import ConfirmationModal from "../components/common/ConfirmationModal";
import { groupService } from "../services/groupService";
import { useAuth } from "../contexts/AuthContext";

const GroupListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  console.log("User in GroupListPage:", user);
  console.log("Is Admin check:", isAdmin);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "active" });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await groupService.getGroups(filters);
      setGroups(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch groups.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleOpenCreateModal = () => {
    console.log("CREATE button clicked! Opening modal...");
    setEditingGroup(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (group) => {
    setEditingGroup(group);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGroup(null);
  };

  const handleSaveGroup = async (groupData) => {
    try {
      if (editingGroup) {
        await groupService.updateGroup(editingGroup._id, groupData);
        toast.success("Group updated successfully!");
      } else {
        await groupService.createGroup(groupData);
        toast.success("Group created successfully!");
      }
      handleCloseModal();
      fetchGroups();
    } catch (error) {
      toast.error("An error occurred.");
    }
  };
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenActionMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const handleToggleActionMenu = (groupId) => {
    setOpenActionMenu(openActionMenu === groupId ? null : groupId);
  };
  const handleToggleStatus = async (group) => {
    try {
      const newStatus = group.status === "active" ? "inactive" : "active";
      await groupService.updateGroup(group._id, { status: newStatus });
      toast.success("Status updated successfully!");
      fetchGroups();
    } catch (error) {
      toast.error("Failed to update status.");
    }
  };

  const handleOpenDeleteConfirm = (groupId) => {
    setDeletingGroupId(groupId);
    setIsConfirmOpen(true);
  };

  const CountUp = ({ end = 0, duration = 700 }) => {
    const [value, setValue] = useState(0);
    useEffect(() => {
      let start = 0;
      const diff = Math.max(0, Number(end) - start);
      if (diff === 0) return void setValue(Number(end));
      let startTime = null;
      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        setValue(Math.round(start + diff * progress));
        if (progress < 1) requestAnimationFrame(step);
      };
      const rafId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(rafId);
    }, [end, duration]);
    return <span className="text-3xl font-bold text-neutral-900">{value}</span>;
  };

  const handleDeleteConfirm = async () => {
    try {
      await groupService.deleteGroup(deletingGroupId);
      toast.success("Group deleted successfully!");
      setIsConfirmOpen(false);
      setDeletingGroupId(null);
      fetchGroups();
    } catch (error) {
      toast.error("Failed to delete group.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" text="Loading teams..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams & Groups"
        subtitle="Manage your organization teams and collaborate effectively"
        icon="groups"
        badge="Team Management"
        actions={
          isAdmin && (
            <Button icon="add" onClick={handleOpenCreateModal}>
              Create Team
            </Button>
          )
        }
      />

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon="groups"
            title="No teams yet"
            description="Create your first team to get started with collaboration."
            action={
              isAdmin && (
                <Button icon="add" onClick={handleOpenCreateModal}>
                  Create Team
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card
              key={group._id}
              hoverable
              className={`h-full ${group.status === "inactive" ? "opacity-60" : ""}`}
              header={
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-neutral-900 truncate mb-2">{group.name}</h3>
                    <Badge variant={group.status === "active" ? "success" : "neutral"} size="sm">
                      {group.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {isAdmin && (
                    <div className="relative" ref={openActionMenu === group._id ? menuRef : null}>
                      <button
                        className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                        onClick={() => handleToggleActionMenu(group._id)}
                      >
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                      {openActionMenu === group._id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-10">
                          <button
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                            onClick={() => {
                              handleOpenEditModal(group);
                              setOpenActionMenu(null);
                            }}
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                            Edit
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                            onClick={() => {
                              handleToggleStatus(group);
                              setOpenActionMenu(null);
                            }}
                          >
                            <span className="material-symbols-outlined text-base">{group.status === "active" ? "lock" : "lock_open"}</span>
                            {group.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-accent-600 hover:bg-accent-50"
                            onClick={() => {
                              handleOpenDeleteConfirm(group._id);
                              setOpenActionMenu(null);
                            }}
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              }
            >
              <div className="space-y-6">
                <p className="text-sm text-neutral-600 leading-relaxed min-h-[40px]">{group.description || "No description provided"}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-success-50 rounded-lg border border-success-100">
                    <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center text-success-600">
                      <span className="material-symbols-outlined">group</span>
                    </div>
                    <div>
                      <CountUp end={group.totalActives || 0} />
                      <div className="text-xs text-neutral-600">Active</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600">
                      <span className="material-symbols-outlined">person_off</span>
                    </div>
                    <div>
                      <CountUp end={group.totalInactives || 0} />
                      <div className="text-xs text-neutral-600">Inactive</div>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  icon="arrow_forward"
                  iconPosition="right"
                  onClick={() => navigate(`/app/organization/group/${group._id}`)}
                >
                  View Members
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateEditGroupModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveGroup} group={editingGroup} />
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Group"
        message="Do you want to delete this group?"
      />
    </div>
  );
};
export default GroupListPage;
