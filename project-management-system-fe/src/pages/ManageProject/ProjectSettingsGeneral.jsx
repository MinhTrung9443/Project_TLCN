// src/pages/ManageProject/ProjectSettingsGeneral.jsx
// [PHIÊN BẢN HOÀN THIỆN]
import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ProjectContext } from "../../contexts/ProjectContext";
import { updateProjectByKey, getProjectByKey } from "../../services/projectService";
import { useAuth } from "../../contexts/AuthContext";
import userService from "../../services/userService";

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
  const { projectData, userProjectRole, setProject } = useContext(ProjectContext);
  const { projectKey } = useParams();
  const [allUsers, setAllUsers] = useState([]);
  const [errors, setErrors] = useState({});

  const isSystemAdmin = user && user.role === "admin";
  const isProjectManager = userProjectRole === "PROJECT_MANAGER";

  const canEditGeneralInfo = isProjectManager || isSystemAdmin;
  const canEditSensitiveInfo = isSystemAdmin;
  const canChangeManager = isSystemAdmin;
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

    if (!formData.name.trim()) {
      newErrors.name = "Project Name is required.";
    }
    if (!formData.key.trim()) {
      newErrors.key = "Key is required.";
    }
    if (!formData.projectManagerId) {
      newErrors.projectManagerId = "Project Manager is required.";
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = "End Date cannot be earlier than Start Date.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    if (canChangeManager) {
      userService
        .getUsers({ status: "active" })
        .then((response) => {
          const usersData = Array.isArray(response.data) ? response.data : response || [];
          setAllUsers(usersData);
        })
        .catch((error) => {
          toast.error("Could not load user list for manager selection.");
        });
    }
  }, [canChangeManager]);

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
    if (!canSaveChanges) return;
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...formData, startDate: formData.startDate || null, endDate: formData.endDate || null };
      await updateProjectByKey(projectKey, payload);
      toast.success("Project updated successfully!");

      const fetchKey = formData.key !== projectKey ? formData.key : projectKey;
      const refreshedProject = await getProjectByKey(fetchKey);

      if (refreshedProject.data) {
        setProject(refreshedProject.data);
      }

      if (formData.key !== projectKey) {
        window.location.href = `/task-mgmt/projects/${formData.key}/settings/general`;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update project.");
    } finally {
      setIsSaving(false);
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
  };

  if (!projectData) {
    return <div className="flex items-center justify-center py-8 text-gray-500">Loading general settings...</div>;
  }
  const managerOptions = canChangeManager ? allUsers : projectData.members.map((m) => m.userId) || [];
  const selectedManager = managerOptions.find((u) => u._id === formData.projectManagerId) || null;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Project Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={!canEditGeneralInfo}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Key <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="key"
            value={formData.key}
            onChange={handleChange}
            required
            disabled={!canEditSensitiveInfo}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {errors.key && <p className="text-sm text-red-600 mt-1">{errors.key}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Type</label>
          <input
            type="text"
            name="type"
            value={formData.type}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={!canEditGeneralInfo}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-semibold text-gray-900 mb-2">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              disabled={!canEditGeneralInfo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-semibold text-gray-900 mb-2">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              disabled={!canEditGeneralInfo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {errors.endDate && <p className="text-sm text-red-600 mt-1">{errors.endDate}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            disabled={!canEditGeneralInfo}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="projectManagerId" className="block text-sm font-semibold text-gray-900 mb-2">
            Project Manager <span className="text-red-600">*</span>
          </label>
          <select
            id="projectManagerId"
            name="projectManagerId"
            value={formData.projectManagerId}
            onChange={handleChange}
            disabled={!canChangeManager}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Select a Manager --</option>
            {managerOptions.map((u) => (
              <option key={u._id} value={u._id}>
                {u.fullname} ({u.email})
              </option>
            ))}
          </select>
          {errors.projectManagerId && <p className="text-sm text-red-600 mt-1">{errors.projectManagerId}</p>}

          {selectedManager && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold">
                {(selectedManager.fullname || "")[0] || "U"}
              </div>
              <div>
                <div className="font-medium text-gray-900">{selectedManager.fullname}</div>
                <div className="text-sm text-gray-600">{selectedManager.email}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {canSaveChanges && (
        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={!hasChanges()}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !hasChanges()}
            className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-purple-300 border-t-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      )}
    </form>
  );
};

export default ProjectSettingsGeneral;
