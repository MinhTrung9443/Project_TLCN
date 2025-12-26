import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import userService from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import "../../styles/pages/ManageUser/ManageUser.css"; // CSS mới

const Component = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Data States
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  
  // UI States
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [popupUserId, setPopupUserId] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteUserData, setDeleteUserData] = useState(null);
  
  // Filter & Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const usersPerPage = 8; // Giảm xuống một chút vì row to hơn

  // --- Fetch Data ---
  useEffect(() => {
    fetchUsers();
  }, []);

  // --- Filter Logic ---
  useEffect(() => {
    let result = users;

    // Filter by Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(u => 
        u.fullname?.toLowerCase().includes(lowerTerm) || 
        u.email?.toLowerCase().includes(lowerTerm) ||
        u.username?.toLowerCase().includes(lowerTerm)
      );
    }

    // Filter by Role
    if (roleFilter !== "all") {
      result = result.filter(u => u.role === roleFilter);
    }

    setFilteredUsers(result);
    setCurrentPage(1); // Reset page on filter change
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      const response = await userService.getAllUsers();
      setUsers(response);
      setFilteredUsers(response);
    } catch (error) {
      toast.error("Failed to fetch users");
    }
  };

  // --- Handlers ---
  const handleMenuClick = (id, event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    // Tính toán vị trí menu
    setPopupPosition({
      top: rect.bottom + window.scrollY, 
      left: rect.left - 100
    });
    setPopupUserId(id);
  };

  const handleClosePopup = () => setPopupUserId(null);

  // Click outside to close menu
  useEffect(() => {
    if (popupUserId) {
      const handleClick = () => handleClosePopup();
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [popupUserId]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newUser = Object.fromEntries(formData.entries());
    newUser.role = "user"; // Default role

    if (newUser.password !== newUser.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const res = await userService.createUser(newUser);
      setUsers([...users, res.user]);
      setShowCreatePopup(false);
      toast.success("User created successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user");
    }
  };

  const handleDeleteUser = async () => {
    try {
      await userService.deleteUser(deleteUserData.userId);
      setUsers(prev => prev.map(u => u._id === deleteUserData.userId ? { ...u, status: "inactive" } : u));
      toast.success("User deactivated");
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  // --- Stats Calculation ---
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    admins: users.filter(u => u.role === 'admin').length
  };

  // --- Pagination Logic ---
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  return (
    <div className="modern-user-page">
      {/* 1. Header & Stats Section */}
      <div className="page-header">
        <div className="header-titles">
          <h1 className="main-title">Team Members</h1>
          <p className="sub-title">Manage access, roles, and user details.</p>
        </div>
        
        <div className="stats-container">
          <div className="stat-card blue">
            <span className="material-symbols-outlined icon">group</span>
            <div className="info">
              <span className="number">{stats.total}</span>
              <span className="label">Total Users</span>
            </div>
          </div>
          <div className="stat-card green">
            <span className="material-symbols-outlined icon">verified_user</span>
            <div className="info">
              <span className="number">{stats.active}</span>
              <span className="label">Active</span>
            </div>
          </div>
          <div className="stat-card purple">
            <span className="material-symbols-outlined icon">admin_panel_settings</span>
            <div className="info">
              <span className="number">{stats.admins}</span>
              <span className="label">Admins</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls Toolbar */}
      <div className="controls-toolbar">
        <div className="search-filter-group">
          <div className="search-box">
            <span className="material-symbols-outlined">search</span>
            <input 
              type="text" 
              placeholder="Search by name, email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="filter-select" 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>

        {user.role === "admin" && (
          <button className="btn-add-modern" onClick={() => setShowCreatePopup(true)}>
            <span className="material-symbols-outlined">add</span>
            New Member
          </button>
        )}
      </div>

      {/* 3. Modern List View (Floating Rows) */}
      <div className="user-list-container custom-scrollbar">
        <div className="table-header-row">
          <div className="col user-col">USER / EMAIL</div>
          <div className="col info-col">CONTACT Info</div>
          <div className="col role-col">ROLE & GROUP</div>
          <div className="col status-col">STATUS</div>
          <div className="col action-col"></div>
        </div>

        {currentUsers.map(u => (
          <div key={u._id} className="user-row-card fade-in">
            {/* User Info */}
            <div className="col user-col" onClick={() => navigate(`/app/Organization/User/${u._id}`)}>
              <div className="avatar-wrapper">
                {u.avatar ? (
                  <img src={u.avatar} alt="avatar" />
                ) : (
                  <div className={`avatar-placeholder bg-${u.fullname.length % 5}`}>
                    {u.fullname.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className={`status-dot ${u.status}`}></span>
              </div>
              <div className="user-details">
                <span className="fullname">{u.fullname}</span>
                <span className="username">@{u.username}</span>
              </div>
            </div>

            {/* Contact Info */}
            <div className="col info-col">
              <div className="contact-item">
                <span className="material-symbols-outlined">mail</span>
                {u.email}
              </div>
              <div className="contact-item">
                <span className="material-symbols-outlined">call</span>
                {u.phone || "N/A"}
              </div>
            </div>

            {/* Role & Group */}
            <div className="col role-col">
              <span className={`role-badge ${u.role}`}>
                {u.role === 'admin' ? 'Admin' : 'Member'}
              </span>
              <div className="groups-mini">
                {u.group?.length > 0 ? (
                   u.group.slice(0, 2).map(g => (
                     <span key={g._id} className="group-pill">{g.name}</span>
                   ))
                ) : <span className="no-group">-</span>}
                {u.group?.length > 2 && <span className="group-pill more">+{u.group.length - 2}</span>}
              </div>
            </div>

            {/* Status */}
            <div className="col status-col">
              <div className={`status-pill ${u.status}`}>
                {u.status}
              </div>
              <div className="last-login">
                {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
              </div>
            </div>

            {/* Action */}
            <div className="col action-col">
              {user.role === 'admin' && (
                <button className="btn-icon" onClick={(e) => handleMenuClick(u._id, e)}>
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {currentUsers.length === 0 && (
          <div className="empty-state">
            <span className="material-symbols-outlined">search_off</span>
            <p>No users found matching your search.</p>
          </div>
        )}
      </div>

      {/* Pagination Modern */}
      {totalPages > 1 && (
        <div className="pagination-modern">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
          >
            Prev
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* --- POPUPS & MODALS (Giữ nguyên logic cũ, chỉ style lại nếu cần) --- */}
      {/* Context Menu */}
      {popupUserId && (
        <div className="floating-menu" style={{top: popupPosition.top, left: popupPosition.left}}>
          <div onClick={() => { handleClosePopup(); navigate(`/app/Organization/User/${popupUserId}`) }}>
            <span className="material-symbols-outlined">edit</span> Edit Details
          </div>
          <div className="danger" onClick={() => {
            const u = users.find(x => x._id === popupUserId);
            setDeleteUserData({userId: u._id, userName: u.fullname});
            setIsDeleteModalOpen(true);
            handleClosePopup();
          }}>
            <span className="material-symbols-outlined">delete</span> Deactivate
          </div>
        </div>
      )}

      {/* Create User Modal - Reusing your existing structure but ensure CSS matches */}
      {showCreatePopup && (
         <div className="user-create-popup-overlay" onClick={() => setShowCreatePopup(false)}>
            <div className="user-create-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <div className="popup-icon">
                <span className="material-symbols-outlined">person_add</span>
              </div>
              <h3 className="popup-title">Create Account</h3>
              <p className="popup-subtitle">Fill in the information below to create a new account.</p>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="form-row">
                <div className="form-group">
                  <label className="required">Full Name</label>
                  <input name="fullname" className="popup-input" placeholder="Enter full name" required />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input name="phone" className="popup-input" placeholder="Enter phone number" />
                </div>
              </div>

              <div className="form-group">
                <label className="required">Email</label>
                <input name="email" className="popup-input" placeholder="Enter email address" type="email" required />
              </div>

              <div className="form-group">
                <label>Address</label>
                <input name="address" className="popup-input" placeholder="Enter address" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Username</label>
                  <input name="username" className="popup-input" placeholder="Enter username" required />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select name="gender" className="popup-input">
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Password</label>
                  <input name="password" className="popup-input" placeholder="Enter password" type="password" required />
                </div>
                <div className="form-group">
                  <label className="required">Confirm Password</label>
                  <input name="confirmPassword" className="popup-input" placeholder="Confirm password" type="password" required />
                </div>
              </div>

               <button type="submit" className="popup-btn-submit">Create User</button>
                 </form>
            </div>
         </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${deleteUserData?.userName}?`}
      />
    </div>
  );
};

export default Component;