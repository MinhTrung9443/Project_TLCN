// src/pages/ManageProject/ProjectSettingsGeneral.jsx
// [PHIÊN BẢN HOÀN THIỆN]
import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ProjectContext } from "../../contexts/ProjectContext";
import { updateProjectByKey, getProjectByKey } from "../../services/projectService"; // Service API để cập nhật
import "../../styles/pages/ManageProject/ProjectSettings_General.css";
import { useAuth } from "../../contexts/AuthContext";
import userService from "../../services/userService"; // <-- Thêm import này

// Hàm helper để định dạng ngày tháng
const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toISOString().split("T")[0];
  } catch (error) {
    return "";
  }
};

const ProjectSettingsGeneral = () => {
  const { user } = useAuth();
  // Chỉ lấy những gì cần thiết từ Context. Không cần gọi setProjectKey ở đây nữa.
  const { projectData, userProjectRole, setProject } = useContext(ProjectContext);
  const { projectKey } = useParams(); // Vẫn cần để gọi API update
  const [allUsers, setAllUsers] = useState([]);
  const [errors, setErrors] = useState({});

  // Quyền chỉnh sửa được quyết định bởi vai trò trong dự án
  const isSystemAdmin = user && user.role === "admin";
  const isProjectManager = userProjectRole === "PROJECT_MANAGER";

  const canEditGeneralInfo = isProjectManager || isSystemAdmin;

  // Quyền đổi PM, Key, Type: Chỉ dành cho Admin hệ thống
  const canEditSensitiveInfo = isSystemAdmin;
  const canChangeManager = isSystemAdmin;
  // Nút "Save" sẽ hiển thị nếu user có quyền sửa
  const canSaveChanges = canEditGeneralInfo;

  const [formData, setFormData] = useState({
    name: "",
    key: "",
    type: "",
    description: "",
    projectManagerId: "",
    startDate: "",
    endDate: "",
    status: "",
  });
  const [initialData, setInitialData] = useState(null);

  const validateForm = () => {
    const newErrors = {};

    // 1. Kiểm tra các trường bắt buộc (có dấu hoa thị)
    if (!formData.name.trim()) {
      newErrors.name = "Project Name is required.";
    }
    if (!formData.key.trim()) {
      newErrors.key = "Key is required.";
    }
    if (!formData.projectManagerId) {
      newErrors.projectManagerId = "Project Manager is required.";
    }

    // 2. Kiểm tra ngày kết thúc không được nhỏ hơn ngày bắt đầu
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = "End Date cannot be earlier than Start Date.";
      }
    }

    setErrors(newErrors); // Cập nhật state lỗi
    return Object.keys(newErrors).length === 0; // Trả về true nếu không có lỗi
  };

  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    if (canChangeManager) {
      userService
        .getUsers({ status: "active" }) // Get only active users
        .then((response) => {
          // Xử lý cả 2 trường hợp API trả về
          const usersData = Array.isArray(response.data) ? response.data : response || [];
          setAllUsers(usersData);
        })
        .catch((error) => {
          toast.error("Could not load user list for manager selection.");
        });
    }
  }, [canChangeManager]);
  // useEffect này chỉ chạy khi `projectData` từ Context thay đổi (được nạp bởi component cha)
  useEffect(() => {
    if (projectData) {
      const projectManager = projectData.members.find((m) => m.role === "PROJECT_MANAGER");
      const data = {
        name: projectData.name || "",
        key: projectData.key || "",
        type: projectData.type || "Scrum",
        description: projectData.description || "",
        projectManagerId: projectManager?.userId?._id || "",
        startDate: formatDateForInput(projectData.startDate),
        endDate: formatDateForInput(projectData.endDate),
        status: projectData.status || "active",
      };
      setFormData(data);
      setInitialData(data);
    }
  }, [projectData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSaveChanges) return; // Chặn submit nếu không có quyền
    if (!validateForm()) {
      return; // Dừng lại nếu có lỗi
    }

    setIsSaving(true);
    try {
      const payload = { ...formData, startDate: formData.startDate || null, endDate: formData.endDate || null };
      await updateProjectByKey(projectKey, payload);
      toast.success("Project updated successfully!");

      // Nếu key thay đổi, dùng key mới để fetch lại project
      const fetchKey = formData.key !== projectKey ? formData.key : projectKey;
      const refreshedProject = await getProjectByKey(fetchKey);

      // Cập nhật lại projectData trong context với dữ liệu mới từ API
      if (refreshedProject.data) {
        setProject(refreshedProject.data);
      }

      // Nếu key thay đổi, redirect đến URL mới
      if (formData.key !== projectKey) {
        window.location.href = `/task-mgmt/projects/${formData.key}/settings/general`;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update project.");
    } finally {
      setIsSaving(false);
    }
  };

  // Hàm reset form về trạng thái ban đầu
  const hasChanges = () => {
    if (!initialData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  };

  const handleCancel = () => {
    if (initialData) {
      setFormData(initialData);
    }
  };

  // Component này không cần xử lý loading/not found nữa, vì component cha đã làm
  if (!projectData) {
    // Có thể hiển thị một skeleton loader nhỏ ở đây trong khi chờ projectData
    return <div>Loading general settings...</div>;
  }
  const managerOptions = canChangeManager ? allUsers : projectData.members.map((m) => m.userId) || [];
  const selectedManager = managerOptions.find((u) => u._id === formData.projectManagerId) || null;

  return (
    <form onSubmit={handleSubmit} className="settings-content-form">
      <div className="form-group">
        <label className="required">Project Name</label>
        <input name="name" value={formData.name} onChange={handleChange} required disabled={!canEditGeneralInfo} />
        {errors.name && <p className="error-text">{errors.name}</p>}
      </div>
      <div className="form-group">
        <label className="required">Key</label>
        {/* Key là trường nhạy cảm, chỉ Admin được sửa */}
        <input name="key" value={formData.key} onChange={handleChange} required disabled={!canEditSensitiveInfo} />
        {errors.key && <p className="error-text">{errors.key}</p>}
      </div>
      <div className="form-group">
        <label>Type</label>
        {/* Hiển thị input nhưng disabled, không cho chỉnh sửa */}
        <input name="type" value={formData.type} disabled className="form-control" />
      </div>
      <div className="form-group">
        <label>Status</label>
        <select name="status" value={formData.status} onChange={handleChange} disabled={!canEditGeneralInfo}>
          <option value="active">Active</option>
          {/* <option value="paused">Paused</option> */}
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startDate">Start Date</label>
          <input id="startDate" name="startDate" type="date" value={formData.startDate} onChange={handleChange} disabled={!canEditGeneralInfo} />
        </div>
        <div className="form-group">
          <label htmlFor="endDate">End Date</label>
          <input id="endDate" name="endDate" type="date" value={formData.endDate} onChange={handleChange} disabled={!canEditGeneralInfo} />
          {errors.endDate && <p className="error-text">{errors.endDate}</p>}
        </div>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea name="description" value={formData.description} onChange={handleChange} rows="4" disabled={!canEditGeneralInfo} />
      </div>
      <div className="form-group">
        <label htmlFor="projectManagerId" className="required">
          Project Manager
        </label>
        <select
          id="projectManagerId"
          name="projectManagerId"
          value={formData.projectManagerId}
          onChange={handleChange}
          disabled={!canChangeManager} // Chỉ Admin được đổi
        >
          <option value="">-- Select a Manager --</option>
          {/* Lặp qua danh sách 'managerOptions' đã được xử lý */}
          {managerOptions.map((u) => (
            <option key={u._id} value={u._id}>
              {u.fullname} ({u.email})
            </option>
          ))}
        </select>
        {errors.projectManagerId && <p className="error-text">{errors.projectManagerId}</p>}
      {selectedManager && (
          <div className="manager-preview">
            <div className="mp-avatar">{(selectedManager.fullname || "")[0] || "U"}</div>
            <div className="mp-meta">
              <div className="mp-name">{selectedManager.fullname}</div>
              <div className="mp-email">{selectedManager.email}</div>
            </div>
          </div>
        )}
      </div>
      {canSaveChanges && (
        <div className="form-actions">
          <button type="button" onClick={handleCancel} className="btn btn-secondary" disabled={!hasChanges()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving || !hasChanges()}>
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </form>
  );
};

export default ProjectSettingsGeneral;
