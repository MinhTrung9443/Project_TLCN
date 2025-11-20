import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/pages/ManageUser/ManageUser.css";
import { useEffect } from "react";
import userService from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";

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
  const { user } = useAuth();
  const [popupUserId, setPopupUserId] = useState(null);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [users, setUsers] = useState([]);

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

  const handleMenuClick = (id) => {
    setPopupUserId(id);
  };

  const handleClosePopup = () => {
    setPopupUserId(null);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    // Lấy dữ liệu từ form
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
      // Gọi API tạo user
      var response = await userService.createUser(newUser);
      // Cập nhật lại danh sách user
      console.log("Created user:", response.user);
      setUsers([...users, response.user]);
      // Đóng popup
      setShowCreatePopup(false);
      // Thông báo thành công
      toast.success("User created successfully");
      e.target.reset();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
      return;
    }
  };

  return (
    <div id="webcrumbs">
      <div className="user-table-container overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">User List</h2>
          {user.role === "admin" && (
            <button
              className="create-user-btn"
              onClick={() => setShowCreatePopup(true)}
            >
              <span className="material-symbols-outlined align-middle mr-2">
                person_add
              </span>
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
            {users.map((eachUser) => (
              <tr key={eachUser._id}>
                <td>
                  {eachUser.avatar ? (
                    <img
                      src={eachUser.avatar}
                      alt={eachUser.fullname}
                      className="user-table-avatar rounded-full object-cover"
                    />
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
                <td className={statusColor[eachUser.status]}>
                  {eachUser.status}
                </td>
                <td className={roleColor[eachUser.role]}>{eachUser.role}</td>
                <td>
                  {eachUser.lastLogin
                    ? new Date(eachUser.lastLogin).toLocaleString()
                    : ""}
                </td>
                <td>
  {Array.isArray(eachUser.group) && eachUser.group.length > 0
    ? eachUser.group.map(g => g.name).join(', ') // <-- ĐÃ SỬA
    : ""}
</td>
                {user.role === "admin" && (
                  <td>
                    <button
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-150 ease-in-out"
                      onClick={() => handleMenuClick(eachUser._id)}
                    >
                      <span className="material-symbols-outlined">
                        more_vert
                      </span>
                    </button>
                  </td>
                )}
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
            onClick={async () => {
              handleClosePopup();
              try {
                const deleteUser = async () => {
                  await userService.deleteUser(popupUserId);
                  //cập nhật trạng thái user mới xóa thành inactive
                  setUsers((prevUsers) =>
                    prevUsers.map((u) =>
                      u._id === popupUserId ? { ...u, status: "inactive" } : u
                    )
                  );
                };
                deleteUser();
              } catch (error) {
                console.error("Error deleting user:", error);
              }
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
              <input
                name="fullname"
                className="popup-input"
                placeholder="Full Name"
                required
              />
              <input
                name="username"
                className="popup-input"
                placeholder="Username"
                required
              />
              <input
                name="email"
                className="popup-input"
                placeholder="Email"
                type="email"
                required
              />
              <input name="phone" className="popup-input" placeholder="Phone" />
              <select name="gender" className="popup-input" required>
                <option value="">Gender</option>
                <option value="male">male</option>
                <option value="female">female</option>
                <option value="other">other</option>
              </select>
              <select name="role" className="popup-input" required>
                <option value="">Role</option>
                <option value="user">user</option>
              </select>
              <input
                name="password"
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
