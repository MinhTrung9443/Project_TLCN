import "../../styles/pages/ManageUser/UserProfile.css";
import "../../styles/pages/MyProfilePage.css";
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
      console.error("Error updating user:", error);
      toast.error("Failed to update user.");
    }
  };

  return (
    <div className="profile-page-container">
      <form className="profile-form" onSubmit={handleUpdateUser}>
        <div className="profile-main-content">
          <div className="profile-tabs">
            <span className="tab-item active">
              <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
                person
              </span>
              Basic Info
            </span>
          </div>

          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label className="required">Full Name</label>
                <input className="user-profile-input" value={updateUser.fullname || ""} onChange={onInputChange} name="fullname" />
              </div>
              <div className="form-group">
                <label className="required">Username</label>
                <input className="user-profile-input" value={updateUser.username || ""} readOnly name="username" />
              </div>
              <div className="form-group">
                <label className="required">Email</label>
                <input className="user-profile-input" value={updateUser.email || ""} readOnly name="email" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input className="user-profile-input" value={updateUser.phone || ""} onChange={onInputChange} name="phone" />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select
                  className="user-profile-select"
                  value={updateUser.gender || "male"}
                  onChange={onInputChange}
                  disabled={!isAdmin}
                  name="gender"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={updateUser.status === "active"}
                    disabled={!isAdmin}
                    onChange={() =>
                      setUpdateUser((prev) => ({
                        ...prev,
                        status: prev.status === "active" ? "inactive" : "active",
                      }))
                    }
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="form-group">
                <label>Role</label>
                <input className="user-profile-input" value={updateUser.role === "admin" ? "Admin" : "User"} readOnly name="role" />
              </div>
              <div className="form-group">
                <label>Groups</label>
                <input
                  readOnly
                  className="user-profile-input"
                  value={Array.isArray(updateUser.group) ? updateUser.group.join(", ") : updateUser.group || ""}
                  name="group"
                />
              </div>
              <div className="form-group">
                <label>Last Login</label>
                <input
                  className="user-profile-input"
                  value={updateUser.lastLogin ? new Date(updateUser.lastLogin).toLocaleString() : ""}
                  readOnly
                  name="lastLogin"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-cancel" type="button" onClick={handleCancel} disabled={!isAdmin || !hasChanges()}>
              Cancel
            </button>
            {isAdmin && (
              <button className="btn-save" type="submit" disabled={!hasChanges()}>
                Save
              </button>
            )}
          </div>
        </div>

        <div className="profile-sidebar">
          <div className="avatar-section">
            <div className="avatar-display">
              {updateUser.avatar ? (
                <img src={updateUser.avatar} alt="Avatar" className="avatar-img-preview" />
              ) : (
                <div className="avatar-placeholder">{updateUser.fullname ? updateUser.fullname.charAt(0).toUpperCase() : "U"}</div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Component;
