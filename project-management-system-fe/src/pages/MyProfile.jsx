import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import "../styles/pages/MyProfilePage.css";
import userService from "../services/userService";

const MyProfilePage = () => {
  const { user, login } = useAuth();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    fullname: "",
    username: "",
    email: "",
    phone: "",
    gender: "",
    avatar: "",
  });
  const [initialData, setInitialData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  useEffect(() => {
    if (user) {
      const userData = {
        fullname: user.fullname || "",
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: user.gender || "",
        avatar: user.avatar || "",
        status: user.status || "inactive",
      };
      setFormData(userData);
      setInitialData(userData);
      setLoading(false);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };
  const handleStatusToggle = (e) => {
    const newStatus = e.target.checked ? "active" : "inactive";
    setFormData((prevState) => ({
      ...prevState,
      status: newStatus,
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    setIsUploading(true);
    try {
      const response = await userService.uploadFile(file);

      setFormData((prev) => ({
        ...prev,
        avatar: response.imageUrl,
      }));

      toast.success("Avatar uploaded! Remember to click 'Save' to apply changes.");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    toast.info("Updating profile...");

    try {
      const response = await userService.updateProfile(formData);

      const updatedUser = response.user || response.data?.user;

      const token = localStorage.getItem("token");
      login(updatedUser, token);

      toast.success("Profile updated successfully!");

      setInitialData(formData);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile.");
    }
  };
  const hasChanges = () => {
    if (!initialData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  };

  const handleCancel = () => {
    if (initialData) {
      setFormData(initialData);
    }
    toast.warn("Changes have been canceled.");
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page-container modern-profile">
      <div className="profile-hero">
        <div className="hero-content">
          <div className="badge-pill">
            <span className="material-symbols-outlined">person</span>
            Account Settings
          </div>
          <h1 className="profile-title">
            <span className="material-symbols-outlined">account_circle</span>
            My Profile
          </h1>
          <p className="profile-subtitle">Manage your personal details and account settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="profile-form-wrapper">
        <div className="profile-layout">
          <div className="profile-sidebar panel">
            <div className="avatar-section">
              <div className="avatar-wrapper">
                <div className="avatar-display">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="avatar-img-preview" />
                  ) : (
                    <div className="avatar-placeholder">{user.fullname ? user.fullname.charAt(0).toUpperCase() : "U"}</div>
                  )}
                </div>
                {isUploading && (
                  <div className="upload-overlay">
                    <div className="spinner-small"></div>
                  </div>
                )}
              </div>

              <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleFileChange} />

              <button type="button" className="btn-upload-avatar" onClick={handleAvatarClick} disabled={isUploading}>
                <span className="material-symbols-outlined">cloud_upload</span>
                {isUploading ? "Uploading..." : "Upload Avatar"}
              </button>

              <div className="sidebar-info">
                <div className="info-card">
                  <div className="info-row">
                    <span className="material-symbols-outlined">badge</span>
                    <div className="info-content">
                      <div className="info-label">Role</div>
                      <div className="info-value">{user?.role || "Member"}</div>
                    </div>
                  </div>
                  <div className="info-row">
                    <span className="material-symbols-outlined">email</span>
                    <div className="info-content">
                      <div className="info-label">Email</div>
                      <div className="info-value">{user?.email}</div>
                    </div>
                  </div>
                  <div className="info-row">
                    <span className="material-symbols-outlined">verified</span>
                    <div className="info-content">
                      <div className="info-label">Status</div>
                      <div className={`info-value status ${formData.status}`}>{formData.status === "active" ? "Active" : "Inactive"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-main-content">
            <div className="form-card panel">
              <div className="card-header">
                <h3 className="section-title">
                  <span className="material-symbols-outlined">info</span>
                  Basic Information
                </h3>
                <p className="section-description">Update your personal details and contact information</p>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="fullname" className="form-label">
                    <span className="material-symbols-outlined">person</span>
                    Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullname"
                    name="fullname"
                    className="form-input"
                    value={formData.fullname}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="username" className="form-label">
                    <span className="material-symbols-outlined">alternate_email</span>
                    Username <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    className="form-input disabled"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    <span className="material-symbols-outlined">mail</span>
                    Email Address <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-input disabled"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="form-label">
                    <span className="material-symbols-outlined">phone</span>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="form-input"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gender" className="form-label">
                    <span className="material-symbols-outlined">wc</span>
                    Gender
                  </label>
                  <select id="gender" name="gender" className="form-input" value={formData.gender} onChange={handleChange}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-cancel" onClick={handleCancel} disabled={!hasChanges()}>
                  <span className="material-symbols-outlined">close</span>
                  Cancel
                </button>
                <button type="submit" className="btn btn-save" disabled={!hasChanges()}>
                  <span className="material-symbols-outlined">save</span>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MyProfilePage;
