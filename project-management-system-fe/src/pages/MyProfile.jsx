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
    fileInputRef.current.click(); // Kích hoạt input ẩn
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file ảnh
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    setIsUploading(true);
    try {
      // Gọi API upload file (đã setup ở các bước trước)
      const response = await userService.uploadFile(file);

      // Cập nhật URL ảnh vào formData
      // Lưu ý: Lúc này ảnh mới hiển thị trên UI, nhưng CHƯA LƯU vào database user cho đến khi bấm nút SAVE
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

      const updatedUser = response.user || response.data?.user; // Tùy cấu trúc trả về của backend

      const token = localStorage.getItem("token");
      login(updatedUser, token);

      toast.success("Profile updated successfully!");

      // Cập nhật initialData sau khi save thành công
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
    // Reset về dữ liệu ban đầu từ context user
    if (initialData) {
      setFormData(initialData);
    }
    toast.warn("Changes have been canceled.");
  };

  if (loading) {
    return <div className="loading-container">Loading profile...</div>;
  }

  return (
    <div className="profile-page-container">
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="profile-main-content">
          <div className="profile-tabs">
            <span className="tab-item active">Personal</span>
          </div>

          <div className="form-section">
            <h3 className="section-title">Basic Info</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="fullname">Full Name *</label>
                <input type="text" id="fullname" name="fullname" value={formData.fullname} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required disabled />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required disabled />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <label className="toggle-switch">
                  <input type="checkbox" id="status" name="status" checked={formData.status === "active"} onChange={handleStatusToggle} />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleCancel} disabled={!hasChanges()}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={!hasChanges()}>
              Save
            </button>
          </div>
        </div>

        <div className="profile-sidebar">
          <div className="avatar-section">
            {/* Logic hiển thị Avatar: Nếu có link ảnh thì hiện ảnh, không thì hiện chữ cái */}
            <div className="avatar-display">
              {formData.avatar ? (
                <img src={formData.avatar} alt="Avatar" className="avatar-img-preview" />
              ) : user.fullname ? (
                user.fullname.charAt(0).toUpperCase()
              ) : (
                "U"
              )}
            </div>

            {/* Input ẩn để chọn file */}
            <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleFileChange} />

            {/* Nút bấm kích hoạt upload */}
            <button type="button" className="btn-upload-avatar" onClick={handleAvatarClick} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload Avatar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MyProfilePage;
