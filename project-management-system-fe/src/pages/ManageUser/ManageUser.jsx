import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/pages/ManageUser/ManageUser.css";
import { useEffect } from "react";
import userService from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/common/ConfirmationModal";

const genderIcon = {
  male: <span className="material-symbols-outlined text-blue-700">male</span>,
  female: <span className="material-symbols-outlined text-red-500">female</span>,
  other: <span className="material-symbols-outlined text-gray-500">person</span>,
};

const statusColor = {
  active: "text-blue-700",
  inactive: "text-gray-500",
};

const roleColor = {
  admin: "text-purple-700",
  user: "text-gray-600",
};

const Component = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [popupUserId, setPopupUserId] = useState(null);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [users, setUsers] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteUserData, setDeleteUserData] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  useEffect(() => {
    const handleClickOutside = () => {
      handleClosePopup();
    };

    if (popupUserId !== null) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [popupUserId]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await userService.getAllUsers();
        console.log("Fetched users:", response);
        setUsers(response);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users");
      }
    };

    fetchUsers();
  }, []);

  const handleFullnameClick = (id) => {
    navigate(`/Organization/User/${id}`);
  };

  const handleMenuClick = (id, event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();

    setPopupPosition({
      top: rect.bottom + window.scrollY + 5,
      left: rect.left + window.scrollX - 110,
    });

    setPopupUserId(id);
  };

  const handleClosePopup = () => {
    setPopupUserId(null);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newUser = {
      fullname: formData.get("fullname"),
      username: formData.get("username"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      gender: formData.get("gender"),
      role: formData.get("role"),
      password: formData.get("password"),
    };
    try {
      var response = await userService.createUser(newUser);
      console.log("Created user:", response.user);
      setUsers([...users, response.user]);
      setShowCreatePopup(false);
      toast.success("User created successfully");
      e.target.reset();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
      return;
    }
  };

  const handleDeleteUser = async () => {
    try {
      await userService.deleteUser(deleteUserData.userId);
      setUsers((prevUsers) => prevUsers.map((u) => (u._id === deleteUserData.userId ? { ...u, status: "inactive" } : u)));
      toast.success("User deleted successfully");
      setIsDeleteModalOpen(false);
      setDeleteUserData(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  return (
    <div id="webcrumbs">
      <div className="user-table-container overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">User List</h2>
          {user.role === "admin" && (
            <button className="create-user-btn" onClick={() => setShowCreatePopup(true)}>
              <span className="material-symbols-outlined align-middle mr-2">person_add</span>
              Create User
            </button>
          )}
        </div>
        <table className="user-table min-w-full border-collapse">
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Full Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Gender</th>
              <th>Status</th>
              <th>Role</th>
              <th>Last Login</th>
              <th>Groups</th>
              {user.role === "admin" && (
                <th>
                  <span className="material-symbols-outlined">apps</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {users.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage).map((eachUser) => (
              <tr key={eachUser._id}>
                <td>
                  {eachUser.avatar ? (
                    <img src={eachUser.avatar} alt={eachUser.fullname} className="user-table-avatar rounded-full object-cover" />
                  ) : (
                    <div className="user-table-avatar flex items-center justify-center rounded-full bg-gray-300 text-gray-600 font-bold text-sm">
                      {eachUser.fullname.charAt(0).toUpperCase()}
                    </div>
                  )}
                </td>
                <td>
                  <button
                    className="text-blue-700 hover:underline font-medium"
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                    onClick={() => handleFullnameClick(eachUser._id)}
                  >
                    {eachUser.fullname}
                  </button>
                </td>
                <td>{eachUser.username}</td>
                <td>{eachUser.email}</td>
                <td>{eachUser.phone}</td>
                <td>{genderIcon[eachUser.gender] || genderIcon.other}</td>
                <td className={statusColor[eachUser.status]}>{eachUser.status}</td>
                <td className={roleColor[eachUser.role]}>{eachUser.role}</td>
                <td>{eachUser.lastLogin ? new Date(eachUser.lastLogin).toLocaleString() : ""}</td>
                <td>
                  <div className="groups-cell">
                    {Array.isArray(eachUser.group) && eachUser.group.length > 0 ? (
                      eachUser.group.map((g) => (
                        <span key={g._id} className="group-tag">
                          {g.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                </td>
                {user.role === "admin" && (
                  <td>
                    <button className="text-gray-400 hover:text-gray-600" onClick={(e) => handleMenuClick(eachUser._id, e)}>
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {users.length > usersPerPage && (
          <div className="pagination">
            <button className="pagination-btn" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>

            <div className="pagination-info">
              Page {currentPage} of {Math.ceil(users.length / usersPerPage)}
            </div>

            <button
              className="pagination-btn"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(users.length / usersPerPage)))}
              disabled={currentPage === Math.ceil(users.length / usersPerPage)}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      {/* Popup menu cho từng user */}
      {popupUserId !== null && (
        <div className="user-popup-menu" style={{ top: `${popupPosition.top}px`, left: `${popupPosition.left}px` }}>
          <button
            onClick={() => {
              handleClosePopup();
              navigate(`/Organization/User/${popupUserId}`);
            }}
          >
            <span className="material-symbols-outlined align-middle mr-2">edit</span>
            Edit
          </button>
          <button
            className="text-red-600"
            onClick={() => {
              const userToDelete = users.find((u) => u._id === popupUserId);
              setDeleteUserData({ userId: popupUserId, userName: userToDelete?.fullname });
              setIsDeleteModalOpen(true);
              handleClosePopup();
            }}
          >
            <span className="material-symbols-outlined align-middle mr-2">delete</span>
            Delete
          </button>
        </div>
      )}

      {/* Popup tạo user */}
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
                <label className="required">Address</label>
                <input name="address" className="popup-input" placeholder="Enter address" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Username</label>
                  <input name="username" className="popup-input" placeholder="Enter username" required />
                </div>
                <div className="form-group">
                  <label className="required">Password</label>
                  <input name="password" className="popup-input" placeholder="Enter password" type="password" required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select name="gender" className="popup-input">
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select name="role" className="popup-input" required>
                    <option value="">Select role</option>
                    <option value="user">User</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="popup-btn-submit">
                Create User Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteUserData(null);
        }}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteUserData?.userName}? This action will deactivate the user account.`}
      />
    </div>
  );
};

export default Component;
