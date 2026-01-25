import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { groupService } from "../services/groupService";
import { useAuth } from "../contexts/AuthContext";

import CreateEditGroupModal from "../components/group/CreateEditGroupModal";
import ConfirmationModal from "../components/common/ConfirmationModal";
import { toast } from "react-toastify";

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
    return <span className="text-3xl font-bold text-gray-900">{value}</span>;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-12 mb-8 shadow-lg flex justify-between items-center">
        <div className="text-white">
          <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 rounded-full px-4 py-2 mb-4">
            <span className="material-symbols-outlined">groups</span>
            <span className="text-sm font-medium">Team Management</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Teams & Groups</h1>
          <p className="text-purple-100">Manage your organization teams and collaborate effectively</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-white text-purple-600 font-semibold px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors shadow-md"
          >
            <span className="material-symbols-outlined">add</span>
            Create New Team
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 text-sm font-medium">Loading teams...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">folder_open</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No teams found</h3>
          <p className="text-gray-600 mb-6">Create your first team to get started</p>
          {isAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">add</span>
              Create Team
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group._id}
              className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all ${group.status === "inactive" ? "opacity-60" : ""}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{group.name}</h3>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full ${
                        group.status === "active" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      {group.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="relative" ref={openActionMenu === group._id ? menuRef : null}>
                      <button
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                        onClick={() => handleToggleActionMenu(group._id)}
                      >
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                      {openActionMenu === group._id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                          <button
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              handleOpenEditModal(group);
                              setOpenActionMenu(null);
                            }}
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                            Edit
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              handleToggleStatus(group);
                              setOpenActionMenu(null);
                            }}
                          >
                            <span className="material-symbols-outlined text-base">{group.status === "active" ? "lock" : "lock_open"}</span>
                            {group.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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

                <p className="text-gray-600 text-sm mb-6 min-h-[40px]">{group.description || "No description provided"}</p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                      <span className="material-symbols-outlined">group</span>
                    </div>
                    <div>
                      <CountUp end={group.totalActives || 0} />
                      <div className="text-xs text-gray-600">Active Members</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                      <span className="material-symbols-outlined">person_off</span>
                    </div>
                    <div>
                      <CountUp end={group.totalInactives || 0} />
                      <div className="text-xs text-gray-600">Inactive Members</div>
                    </div>
                  </div>
                </div>

                <button
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
                  onClick={() => navigate(`/app/organization/group/${group._id}`)}
                >
                  View Members
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>
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
