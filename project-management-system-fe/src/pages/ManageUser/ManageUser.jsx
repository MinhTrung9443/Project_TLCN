import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import userService from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import "../../styles/pages/ManageUser/ManageUser.css";

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
      result = result.filter(
        (u) =>
          u.fullname?.toLowerCase().includes(lowerTerm) ||
          u.email?.toLowerCase().includes(lowerTerm) ||
          u.username?.toLowerCase().includes(lowerTerm),
      );
    }

    // Filter by Role
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
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
      left: rect.left - 100,
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
      setUsers((prev) => prev.map((u) => (u._id === deleteUserData.userId ? { ...u, status: "inactive" } : u)));
      toast.success("User deactivated");
      setIsDeleteModalOpen(false);
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to deactivate user";
      toast.error(message);
    }
  };

  // --- Stats Calculation ---
  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    admins: users.filter((u) => u.role === "admin").length,
  };

  // --- Pagination Logic ---
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  return (
    <div className="users-page-container">
      <div className="users-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="material-symbols-outlined">groups</span>
            User Management
          </div>
          <h1 className="hero-title">Team Members</h1>
          <p className="hero-subtitle">Manage access, roles, and user details across your organization</p>
        </div>
        <div className="hero-stats">
          <div className="stat-chip">
            <span className="material-symbols-outlined">group</span>
            <div className="stat-info">
              <strong>{stats.total}</strong>
              <span>Total Users</span>
            </div>
          </div>
          <div className="stat-chip">
            <span className="material-symbols-outlined">verified_user</span>
            <div className="stat-info">
              <strong>{stats.active}</strong>
              <span>Active</span>
            </div>
          </div>
          <div className="stat-chip">
            <span className="material-symbols-outlined">admin_panel_settings</span>
            <div className="stat-info">
              <strong>{stats.admins}</strong>
              <span>Admins</span>
            </div>
          </div>
        </div>
      </div>

      <div className="users-controls">
        <div className="search-filter-wrapper">
          <div className="search-box">
            <span className="material-symbols-outlined">search</span>
            <input type="text" placeholder="Search by name, email, username..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>
        {user.role === "admin" && (
          <button className="btn-add-user" onClick={() => setShowCreatePopup(true)}>
            <span className="material-symbols-outlined">person_add</span>
            Add Member
          </button>
        )}
      </div>

      <div className="users-grid">
        {currentUsers.map((u) => (
          <div key={u._id} className="user-card">
            <div className="user-card-header">
              <div className="user-avatar-section" onClick={() => navigate(`/app/Organization/User/${u._id}`)}>
                {u.avatar ? (
                  <img src={u.avatar} alt="avatar" className="user-avatar-img" />
                ) : (
                  <div className="user-avatar-placeholder">{u.fullname.charAt(0).toUpperCase()}</div>
                )}
                <span className={`avatar-status-dot ${u.status}`}></span>
              </div>
              {user.role === "admin" && (
                <button className="btn-menu" onClick={(e) => handleMenuClick(u._id, e)}>
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              )}
            </div>

            <div className="user-card-body" onClick={() => navigate(`/app/Organization/User/${u._id}`)}>
              <h3 className="user-name">{u.fullname}</h3>
              <p className="user-username">@{u.username}</p>
              <div className="user-contact-info">
                <div className="contact-row">
                  <span className="material-symbols-outlined">email</span>
                  <span>{u.email}</span>
                </div>
                <div className="contact-row">
                  <span className="material-symbols-outlined">phone</span>
                  <span>{u.phone || "N/A"}</span>
                </div>
              </div>
            </div>

            <div className="user-card-footer">
              <div className="user-role-status">
                <span className={`role-badge ${u.role}`}>
                  <span className="material-symbols-outlined">{u.role === "admin" ? "admin_panel_settings" : "person"}</span>
                  {u.role === "admin" ? "Admin" : "User"}
                </span>
                <span className={`status-badge ${u.status}`}>
                  <span className="status-dot"></span>
                  {u.status}
                </span>
              </div>
              {u.group?.length > 0 && (
                <div className="user-groups">
                  {u.group.slice(0, 2).map((g) => (
                    <span key={g._id} className="group-tag">
                      {g.name}
                    </span>
                  ))}
                  {u.group.length > 2 && <span className="group-tag more">+{u.group.length - 2}</span>}
                </div>
              )}
              <div className="user-last-login">
                <span className="material-symbols-outlined">schedule</span>
                Last login: {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}
              </div>
            </div>
          </div>
        ))}

        {currentUsers.length === 0 && (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-icon">search_off</span>
            <h3>No users found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="pagination-btn">
            <span className="material-symbols-outlined">chevron_left</span>
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="pagination-btn">
            Next
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}

      {popupUserId && (
        <div className="context-menu" style={{ top: popupPosition.top, left: popupPosition.left }}>
          <div
            className="menu-item"
            onClick={() => {
              handleClosePopup();
              navigate(`/app/Organization/User/${popupUserId}`);
            }}
          >
            <span className="material-symbols-outlined">edit</span>
            Edit Details
          </div>
          <div
            className="menu-item danger"
            onClick={() => {
              const u = users.find((x) => x._id === popupUserId);
              setDeleteUserData({ userId: u._id, userName: u.fullname });
              setIsDeleteModalOpen(true);
              handleClosePopup();
            }}
          >
            <span className="material-symbols-outlined">delete</span>
            Deactivate
          </div>
        </div>
      )}

      {showCreatePopup && (
        <div className="modal-overlay" onClick={() => setShowCreatePopup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon">
                <span className="material-symbols-outlined">person_add</span>
              </div>
              <h2 className="modal-title">Create New Member</h2>
              <p className="modal-subtitle">Fill in the information below to create a new user account</p>
            </div>

            <form onSubmit={handleCreateUser} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <span className="material-symbols-outlined">person</span>
                    Full Name <span className="required">*</span>
                  </label>
                  <input name="fullname" className="form-input" placeholder="Enter full name" required />
                </div>
                <div className="form-group">
                  <label>
                    <span className="material-symbols-outlined">phone</span>
                    Phone
                  </label>
                  <input name="phone" className="form-input" placeholder="Enter phone number" />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <span className="material-symbols-outlined">email</span>
                  Email <span className="required">*</span>
                </label>
                <input name="email" className="form-input" placeholder="Enter email address" type="email" required />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <span className="material-symbols-outlined">badge</span>
                    Username <span className="required">*</span>
                  </label>
                  <input name="username" className="form-input" placeholder="Enter username" required />
                </div>
                <div className="form-group">
                  <label>
                    <span className="material-symbols-outlined">wc</span>
                    Gender
                  </label>
                  <select name="gender" className="form-input">
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <span className="material-symbols-outlined">lock</span>
                    Password <span className="required">*</span>
                  </label>
                  <input name="password" className="form-input" placeholder="Enter password" type="password" required />
                </div>
                <div className="form-group">
                  <label>
                    <span className="material-symbols-outlined">lock</span>
                    Confirm Password <span className="required">*</span>
                  </label>
                  <input name="confirmPassword" className="form-input" placeholder="Confirm password" type="password" required />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreatePopup(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  <span className="material-symbols-outlined">check</span>
                  Create User
                </button>
              </div>
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
