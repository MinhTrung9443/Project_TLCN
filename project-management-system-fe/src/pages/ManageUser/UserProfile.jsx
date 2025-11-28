import "../../styles/pages/ManageUser/UserProfile.css";
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
    <div id="webcrumbs">
      <div className="user-profile-container">
        {/* Avatar section */}
        <div className="user-profile-avatar">
          {updateUser.avatar ? (
            <img src={updateUser.avatar} alt="Avatar" className="user-profile-avatar-img" />
          ) : (
            <div className="user-profile-avatar-img">{updateUser.fullname ? updateUser.fullname.charAt(0).toUpperCase() : "U"}</div>
          )}
        </div>

        {/* Info section */}
        <form className="user-profile-info" onSubmit={handleUpdateUser}>
          <div className="user-profile-title">
            <span className="material-symbols-outlined mr-2">person</span>
            Basic Info
          </div>
          <div>
            <label className="user-profile-label required">Full Name</label>
            <input className="user-profile-input" value={updateUser.fullname || ""} onChange={onInputChange} name="fullname" />
          </div>
          <div>
            <label className="user-profile-label required">Username</label>
            <input className="user-profile-input" value={updateUser.username || ""} readOnly name="username" />
          </div>
          <div>
            <label className="user-profile-label required">Email</label>
            <input className="user-profile-input" value={updateUser.email || ""} readOnly name="email" />
          </div>
          <div>
            <label className="user-profile-label">Phone</label>
            <input className="user-profile-input" value={updateUser.phone || ""} onChange={onInputChange} name="phone" />
          </div>
          <div>
            <label className="user-profile-label">Gender</label>
            <select className="user-profile-select" value={updateUser.gender || "male"} onChange={onInputChange} name="gender">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="user-profile-label">Status</label>
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

          <div>
            <label className="user-profile-label">Role</label>
            <select className="user-profile-select" value={updateUser.role || "user"} readOnly name="role">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="user-profile-label">Groups</label>
            <input
              readOnly
              className="user-profile-input"
              value={Array.isArray(updateUser.group) ? updateUser.group.join(", ") : updateUser.group || ""}
              name="group"
            />
          </div>
          <div>
            <label className="user-profile-label">Last Login</label>
            <input
              className="user-profile-input"
              value={updateUser.lastLogin ? new Date(updateUser.lastLogin).toLocaleString() : ""}
              readOnly
              name="lastLogin"
            />
          </div>
          <div className="user-profile-actions">
            <button className="user-profile-btn-cancel" type="button" onClick={handleCancel} disabled={!isAdmin || !hasChanges()}>
              Cancel
            </button>
            {isAdmin && (
              <button className="user-profile-btn-save" type="submit" disabled={!hasChanges()}>
                Save
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Component;
