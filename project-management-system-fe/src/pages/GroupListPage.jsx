import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { groupService } from "../services/groupService";
import { useAuth } from "../contexts/AuthContext";
import "../styles/pages/GroupListPage.css";

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
    <div className="group-page-container">
      <div className="group-page-header">
        <div className="header-content">
          <h1 className="group-page-title">Groups</h1>
        </div>
        {isAdmin && (
          <button onClick={handleOpenCreateModal} className="create-button">
            <span className="plus-icon">+</span>
            Create Group
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading teams...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No teams found</h3>
          <p>Create your first team to get started</p>
        </div>
      ) : (
        <div className="groups-grid">
          {groups.map((group) => (
            <div key={group._id} className={`group-card ${group.status === "inactive" ? "inactive" : ""}`}>
              <div className="group-card-header">
                <div className="group-name-section">
                  <h3 className="group-name">{group.name}</h3>
                  <span className={`status-badge ${group.status}`}>{group.status === "active" ? "Active" : "Inactive"}</span>
                </div>
                {isAdmin && (
                  <div className="action-menu-container" ref={openActionMenu === group._id ? menuRef : null}>
                    <button className="action-menu-trigger" onClick={() => handleToggleActionMenu(group._id)}>
                      ⋮
                    </button>
                    {openActionMenu === group._id && (
                      <div className="action-menu-dropdown">
                        <button
                          className="action-menu-item"
                          onClick={() => {
                            handleOpenEditModal(group);
                            setOpenActionMenu(null);
                          }}
                        >
                          <span className="menu-icon">✏️</span>
                          Edit
                        </button>
                        <button
                          className="action-menu-item"
                          onClick={() => {
                            handleToggleStatus(group);
                            setOpenActionMenu(null);
                          }}
                        >
                          <span className="menu-icon">{group.status === "active" ? "🔒" : "🔓"}</span>
                          {group.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="action-menu-item delete"
                          onClick={() => {
                            handleOpenDeleteConfirm(group._id);
                            setOpenActionMenu(null);
                          }}
                        >
                          <span className="menu-icon">🗑️</span>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="group-description">{group.description || "No description provided"}</p>

              <div className="group-stats">
                <div className="stat-item">
                  <div className="stat-icon active-icon">👥</div>
                  <div className="stat-content">
                    <span className="stat-number">{group.totalActives || 0}</span>
                    <span className="stat-label">Active Members</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon inactive-icon">💤</div>
                  <div className="stat-content">
                    <span className="stat-number">{group.totalInactives || 0}</span>
                    <span className="stat-label">Inactive Members</span>
                  </div>
                </div>
              </div>

              <div className="group-card-footer">
                <button className="view-members-btn" onClick={() => navigate(`/app/organization/group/${group._id}`)}>
                  View Members
                  <span className="arrow-icon">→</span>
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
