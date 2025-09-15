import React from "react";
import "../../styles/pages/ManageUser/UserProfile.css";

const Component = () => {
  return (
    <div id="webcrumbs">
      <div className="user-profile-container">
        {/* Avatar section */}
        <div className="user-profile-avatar">
          <div className="user-profile-avatar-img">N</div>
          <button className="user-profile-upload-btn">
            <span className="material-symbols-outlined">photo_camera</span>
            Upload Avatar
          </button>
        </div>
        {/* Info section */}
        <form className="user-profile-info">
          <div className="user-profile-title">
            <span className="material-symbols-outlined mr-2">person</span>
            Basic Info
          </div>
          <div>
            <label className="user-profile-label">
              Full Name<span className="text-red-500">*</span>
            </label>
            <input className="user-profile-input" defaultValue="Nguyen Van A" />
          </div>
          <div>
            <label className="user-profile-label">
              Username<span className="text-red-500">*</span>
            </label>
            <input
              className="user-profile-input"
              defaultValue="nguyenvana"
              readOnly
            />
          </div>
          <div>
            <label className="user-profile-label">
              Email<span className="text-red-500">*</span>
            </label>
            <input
              className="user-profile-input"
              defaultValue="nguyenvana@gmail.com"
              readOnly
            />
          </div>
          <div>
            <label className="user-profile-label">Phone</label>
            <input className="user-profile-input" defaultValue="0123456789" />
          </div>
          <div>
            <label className="user-profile-label">Gender</label>
            <select className="user-profile-select" defaultValue="male">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="user-profile-label">Status</label>
            <select className="user-profile-select" defaultValue="active">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="user-profile-label">Role</label>
            <select className="user-profile-select" defaultValue="user">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="user-profile-label">Groups</label>
            <input
              className="user-profile-input"
              defaultValue="General, Project X"
            />
          </div>
          <div>
            <label className="user-profile-label">Last Login</label>
            <input
              className="user-profile-input"
              defaultValue="17:00:00 10/9/2025"
              readOnly
            />
          </div>
          <div className="user-profile-actions">
            <button className="user-profile-btn-save" type="submit">
              Save
            </button>
            <button className="user-profile-btn-cancel" type="button">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Component;
