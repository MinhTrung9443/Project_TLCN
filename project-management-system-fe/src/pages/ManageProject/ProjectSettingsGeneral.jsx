// src/pages/ManageProject/ProjectSettingsGeneral.jsx
// [PHIÊN BẢN HOÀN THIỆN]
import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
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
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" text="Loading general settings..." />
      </div>
    );
  }
  const managerOptions = canChangeManager ? allUsers : projectData.members.map((m) => m.userId) || [];
  const selectedManager = managerOptions.find((u) => u._id === formData.projectManagerId) || null;

  return (
    <Card className="max-w-3xl" padding>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Project name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={!canEditGeneralInfo}
            error={errors.name}
            placeholder="Project X"
          />
          <Input
            label="Key"
            name="key"
            value={formData.key}
            onChange={handleChange}
            required
            disabled={!canEditSensitiveInfo}
            error={errors.key}
            placeholder="PROJ"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Input label="Type" name="type" value={formData.type} disabled />
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-neutral-700 mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={!canEditGeneralInfo}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-neutral-700 mb-2">
              Start date
            </label>
            <input
              id="startDate"
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              disabled={!canEditGeneralInfo}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-neutral-700 mb-2">
              End date
            </label>
            <input
              id="endDate"
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              disabled={!canEditGeneralInfo}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50"
            />
            {errors.endDate && <p className="text-sm text-accent-600 mt-1">{errors.endDate}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            disabled={!canEditGeneralInfo}
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50"
            placeholder="What is this project about?"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="projectManagerId" className="block text-sm font-medium text-neutral-700">
            Project Manager
          </label>
          <select
            id="projectManagerId"
            name="projectManagerId"
            value={formData.projectManagerId}
            onChange={handleChange}
            disabled={!canChangeManager}
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50"
          >
            <option value="">-- Select a Manager --</option>
            {managerOptions.map((u) => (
              <option key={u._id} value={u._id}>
                {u.fullname} ({u.email})
              </option>
            ))}
          </select>
          {errors.projectManagerId && <p className="text-sm text-accent-600">{errors.projectManagerId}</p>}

          {selectedManager && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-primary-50 rounded-lg border border-primary-200">
              <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold">
                {(selectedManager.fullname || "")[0] || "U"}
              </div>
              <div>
                <div className="font-medium text-neutral-900">{selectedManager.fullname}</div>
                <div className="text-sm text-neutral-600">{selectedManager.email}</div>
              </div>
            </div>
          )}
        </div>

        {canSaveChanges && (
          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            <Button variant="secondary" type="button" onClick={handleCancel} disabled={!hasChanges()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !hasChanges()}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
};

export default ProjectSettingsGeneral;
