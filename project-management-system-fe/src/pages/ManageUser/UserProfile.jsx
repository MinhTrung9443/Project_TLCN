import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import userService from "../../services/userService";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";

const Component = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [user, setUser] = useState(null);
  const [updateUser, setUpdateUser] = useState(user || {});
  const [initialData, setInitialData] = useState(null);
  const { userId } = useParams();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await userService.getUserById(userId);
        // Cập nhật state với thông tin user
        setUser(user);
        setUpdateUser(user);
        setInitialData(user);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [userId]);

  const onInputChange = (e) => {
    const { name, value } = e.target;
    setUpdateUser((prev) => ({ ...prev, [name]: value }));
  };

  const hasChanges = () => {
    if (!initialData) return false;
    return JSON.stringify(updateUser) !== JSON.stringify(initialData);
  };

  const handleCancel = () => {
    if (initialData) {
      setUpdateUser(initialData);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      console.log("Updating user:", updateUser);
      const response = await userService.updateUserInfo(userId, updateUser);
      console.log("Update response:", response);
      toast.success("User updated successfully!");
      // Cập nhật initialData sau khi save thành công
      setInitialData(updateUser);
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to update user";
      console.error("Error updating user:", error);
      toast.error(message);
    }
  };

  return (
    <div className="user-profile-container">
      <div className="user-profile-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="material-symbols-outlined">person</span>
            User Profile
          </div>
          <h1 className="hero-title">{updateUser.fullname || "User Details"}</h1>
          <p className="hero-subtitle">View and manage user information and settings</p>
        </div>
      </div>

      <form className="profile-content" onSubmit={handleUpdateUser}>
        <div className="profile-main">
          <div className="profile-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="material-symbols-outlined">badge</span>
                Personal Information
              </h2>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="fullname" className="form-label">
                  <span className="material-symbols-outlined">person</span>
                  Full Name
                </label>
                <input
                  id="fullname"
                  name="fullname"
                  className="form-input"
                  value={updateUser.fullname || ""}
                  onChange={onInputChange}
                  placeholder="Enter full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  <span className="material-symbols-outlined">badge</span>
                  Username
                </label>
                <input id="username" name="username" className="form-input disabled" value={updateUser.username || ""} readOnly disabled />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  <span className="material-symbols-outlined">email</span>
                  Email Address
                </label>
                <input id="email" name="email" type="email" className="form-input disabled" value={updateUser.email || ""} readOnly disabled />
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  <span className="material-symbols-outlined">phone</span>
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  className="form-input"
                  value={updateUser.phone || ""}
                  onChange={onInputChange}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender" className="form-label">
                  <span className="material-symbols-outlined">wc</span>
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  className="form-input"
                  value={updateUser.gender || "male"}
                  onChange={onInputChange}
                  disabled={!isAdmin}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="role" className="form-label">
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                  Role
                </label>
                <input
                  id="role"
                  name="role"
                  className="form-input disabled"
                  value={updateUser.role === "admin" ? "Admin" : "User"}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group">
                <label htmlFor="group" className="form-label">
                  <span className="material-symbols-outlined">groups</span>
                  Groups
                </label>
                <input
                  id="group"
                  name="group"
                  className="form-input disabled"
                  value={Array.isArray(updateUser.group) ? updateUser.group.join(", ") : updateUser.group || ""}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastLogin" className="form-label">
                  <span className="material-symbols-outlined">schedule</span>
                  Last Login
                </label>
                <input
                  id="lastLogin"
                  name="lastLogin"
                  className="form-input disabled"
                  value={updateUser.lastLogin ? new Date(updateUser.lastLogin).toLocaleString() : "Never"}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {isAdmin && (
              <div className="status-section">
                <label className="status-label">
                  <span className="material-symbols-outlined">toggle_on</span>
                  Account Status
                </label>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={updateUser.status === "active"}
                    onChange={() =>
                      setUpdateUser((prev) => ({
                        ...prev,
                        status: prev.status === "active" ? "inactive" : "active",
                      }))
                    }
                  />
                  <span className="slider"></span>
                  <span className="toggle-label">{updateUser.status === "active" ? "Active" : "Inactive"}</span>
                </label>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-cancel" onClick={handleCancel} disabled={!isAdmin || !hasChanges()}>
              <span className="material-symbols-outlined">close</span>
              Cancel
            </button>
            {isAdmin && (
              <button type="submit" className="btn btn-save" disabled={!hasChanges()}>
                <span className="material-symbols-outlined">save</span>
                Save Changes
              </button>
            )}
          </div>
        </div>

        <div className="profile-sidebar">
          <div className="avatar-card">
            <div className="avatar-wrapper">
              {updateUser.avatar ? (
                <img src={updateUser.avatar} alt="Avatar" className="avatar-image" />
              ) : (
                <div className="avatar-placeholder">{updateUser.fullname ? updateUser.fullname.charAt(0).toUpperCase() : "U"}</div>
              )}
            </div>
            <h3 className="avatar-name">{updateUser.fullname}</h3>
            <p className="avatar-role">
              <span className="material-symbols-outlined">{updateUser.role === "admin" ? "admin_panel_settings" : "person"}</span>
              {updateUser.role === "admin" ? "Administrator" : "User"}
            </p>
            <div className={`avatar-status ${updateUser.status}`}>
              <span className="status-dot"></span>
              {updateUser.status}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Component;
