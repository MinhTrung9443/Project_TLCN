import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupService } from '../services/groupService';
import { useAuth } from '../contexts/AuthContext'; 
import '../styles/pages/GroupListPage.css';

import CreateEditGroupModal from '../components/group/CreateEditGroupModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { toast } from 'react-toastify'; 

const GroupListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
 console.log("User in GroupListPage:", user);
  console.log("Is Admin check:", isAdmin);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'active' }); 

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
      toast.error('Failed to fetch groups.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleOpenCreateModal = () => {
    console.log('CREATE button clicked! Opening modal...'); 
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
        toast.success('Group updated successfully!');
      } else {
        await groupService.createGroup(groupData);
        toast.success('Group created successfully!');
      }
      handleCloseModal();
      fetchGroups(); 
    } catch (error) {
      toast.error('An error occurred.');
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
      const newStatus = group.status === 'active' ? 'inactive' : 'active';
      await groupService.updateGroup(group._id, { status: newStatus });
      toast.success('Status updated successfully!');
      fetchGroups();
    } catch (error) {
      toast.error('Failed to update status.');
    }
  };

  const handleOpenDeleteConfirm = (groupId) => {
    setDeletingGroupId(groupId);
    setIsConfirmOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
      try {
          await groupService.deleteGroup(deletingGroupId);
          toast.success('Group deleted successfully!');
          setIsConfirmOpen(false);
          setDeletingGroupId(null);
          fetchGroups();
      } catch (error) {
          toast.error('Failed to delete group.');
      }
  }

  return (
    <div className="group-page-container">
      <div className="group-page-header">
        <h1 className="group-page-title">Groups</h1>
        {isAdmin && (
          <button onClick={handleOpenCreateModal} className="create-button">
            CREATE
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="groups-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Total Actives</th>
              <th>Total Inactives</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group._id}>
                <td>{group.name}</td>
                <td>{group.description}</td>
                <td>{group.totalActives}</td>
                <td>{group.totalInactives}</td>
                <td>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={group.status === 'active'}
                      onChange={() => handleToggleStatus(group)}
                      disabled={!isAdmin}
                    />
                    <span className="slider"></span>
                  </label>
                </td>
                <td>
                  {isAdmin && (
                    <div className="action-menu-container" ref={openActionMenu === group._id ? menuRef : null}>
                      <button 
                        className="action-menu-trigger" 
                        onClick={() => handleToggleActionMenu(group._id)}
                      >
                        &#8942; 
                      </button>

                      {openActionMenu === group._id && (
                        <div className="action-menu-dropdown">
                          <button className="action-menu-item" onClick={() => { handleOpenEditModal(group); setOpenActionMenu(null); }}>
                            Edit
                          </button>
                          <button className="action-menu-item" onClick={() => { handleOpenDeleteConfirm(group._id); setOpenActionMenu(null); }}>
                            Delete
                          </button>
                          <button className="action-menu-item" onClick={() => navigate(`/organization/group/${group._id}`)}>
                            View Member
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <CreateEditGroupModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveGroup}
        group={editingGroup}
      />
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