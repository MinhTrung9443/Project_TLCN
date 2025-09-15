import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/pages/ManageUser/ManageUser.css";

const users = [
  {
    id: 1,
    avatar: "",
    fullname: "Nguyen Van A",
    username: "nguyenvana",
    email: "nguyenvana@gmail.com",
    phone: "0123456789",
    gender: "male",
    status: "active",
    role: "user",
    lastLogin: "2025-09-10T10:00:00Z",
    groups: ["General", "Project X"],
  },
  {
    id: 2,
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    fullname: "Tran Thi B",
    username: "tranthib",
    email: "tranthib@gmail.com",
    phone: "0987654321",
    gender: "female",
    status: "inactive",
    role: "admin",
    lastLogin: "2025-09-12T08:30:00Z",
    groups: ["General"],
  },
  // ...thêm user mẫu khác nếu cần
];

const genderIcon = {
  male: <span className="material-symbols-outlined text-blue-700">male</span>,
  female: (
    <span className="material-symbols-outlined text-red-500">female</span>
  ),
  other: (
    <span className="material-symbols-outlined text-gray-500">person</span>
  ),
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
  const [popupUserId, setPopupUserId] = useState(null);
  const [showCreatePopup, setShowCreatePopup] = useState(false);

  const handleFullnameClick = (id) => {
    navigate(`/Organization/User/${id}`);
  };

  const handleMenuClick = (id) => {
    setPopupUserId(id);
  };

  const handleClosePopup = () => {
    setPopupUserId(null);
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    // Xử lý tạo user ở đây
    setShowCreatePopup(false);
  };

  return (
    <div id="webcrumbs">
      <div className="user-table-container overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">User List</h2>
          <button
            className="create-user-btn"
            onClick={() => setShowCreatePopup(true)}
          >
            <span className="material-symbols-outlined align-middle mr-2">
              person_add
            </span>
            Create User
          </button>
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
              <th>
                <span className="material-symbols-outlined">apps</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.fullname}
                      className="user-table-avatar rounded-full object-cover"
                    />
                  ) : (
                    <div className="user-table-avatar flex items-center justify-center rounded-full bg-gray-300 text-gray-600 font-bold text-sm">
                      {user.fullname.charAt(0).toUpperCase()}
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
                    onClick={() => handleFullnameClick(user.id)}
                  >
                    {user.fullname}
                  </button>
                </td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>{genderIcon[user.gender] || genderIcon.other}</td>
                <td className={statusColor[user.status]}>{user.status}</td>
                <td className={roleColor[user.role]}>{user.role}</td>
                <td>
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString()
                    : ""}
                </td>
                <td>
                  {user.groups && user.groups.length > 0
                    ? user.groups.join(", ")
                    : ""}
                </td>
                <td>
                  <button
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-150 ease-in-out"
                    onClick={() => handleMenuClick(user.id)}
                  >
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Popup menu cho từng user */}
      {popupUserId !== null && (
        <div className="user-popup-menu">
          <button
            onClick={() => {
              handleClosePopup();
              navigate(`/Organization/User/${popupUserId}`);
            }}
          >
            <span className="material-symbols-outlined align-middle mr-2">
              edit
            </span>
            Edit
          </button>
          <button
            className="text-red-600"
            onClick={() => {
              handleClosePopup();
              // Xử lý xóa user ở đây
            }}
          >
            <span className="material-symbols-outlined align-middle mr-2">
              delete
            </span>
            Delete
          </button>
          <button className="text-gray-500" onClick={handleClosePopup}>
            Close
          </button>
        </div>
      )}

      {/* Popup tạo user */}
      {showCreatePopup && (
        <div
          className="user-create-popup-overlay"
          onClick={() => setShowCreatePopup(false)}
        >
          <div
            className="user-create-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="popup-title">Create User</h3>
            <form onSubmit={handleCreateUser}>
              <input className="popup-input" placeholder="Full Name" required />
              <input className="popup-input" placeholder="Username" required />
              <input
                className="popup-input"
                placeholder="Email"
                type="email"
                required
              />
              <input className="popup-input" placeholder="Phone" />
              <select className="popup-input" required>
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <select className="popup-input" required>
                <option value="">Role</option>
                <option value="user">User</option>
              </select>
              <input
                className="popup-input"
                placeholder="Password"
                type="password"
                required
              />
              <div className="popup-actions">
                <button type="submit" className="popup-btn-primary">
                  Create
                </button>
                <button
                  type="button"
                  className="popup-btn"
                  onClick={() => setShowCreatePopup(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Component;
