// src/pages/ManageProject/ProjectSettingsGeneral.jsx
import React, { useContext, useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
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
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch (error) {
    return "";
  }
};

const ProjectSettingsGeneral = () => {
  const { user } = useAuth();
  const { projectData, userProjectRole, setProject } = useContext(ProjectContext);
  const { projectKey } = useParams();
  const location = useLocation();
  const [allUsers, setAllUsers] = useState([]);
  const [errors, setErrors] = useState({});

  // GitHub Integration States
  const [githubRepos, setGithubRepos] = useState([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [selectedRepoStr, setSelectedRepoStr] = useState("");

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
      
      // Preset repo connection if exist
      if (projectData.githubRepoId) {
        setSelectedRepoStr(
          JSON.stringify({
            id: projectData.githubRepoId,
            name: projectData.githubRepoName,
            html_url: projectData.githubRepoUrl
          })
        );
      }
    }
  }, [projectData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("github_link") === "success") {
      toast.success("Kết nối tài khoản GitHub thành công! Bạn có thể chọn Repository ngay bây giờ.");
    }
  }, [location.search]);

  const connectToGithub = () => {
    if (!user || (!user._id && !user.id)) {
      toast.error("Không xác định được user.");
      return;
    }
    const userId = user._id || user.id;
    
    // Ghi nhớ URL trang hiện tại vào query parameter khi chuyển hướng
    const currentUrl = window.location.pathname;
    window.location.href = `http://localhost:8080/api/github/auth?userId=${userId}&returnTo=${encodeURIComponent(currentUrl)}`;
  };

  const fetchGithubRepos = async () => {
    setIsLoadingRepos(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/github/repos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.status === 403 || res.status === 401) {
        toast.info("Vui lòng kết nối GitHub trước khi lấy danh sách repo.");
        setIsGithubConnected(false);
      } else if (res.ok) {
        const repos = await res.json();
        setGithubRepos(repos);
        setIsGithubConnected(true);
      } else {
        toast.error("Không thể lấy danh sách repository từ GitHub.");
      }
    } catch (error) {
      toast.error("Lỗi mạng khi tải danh sách repo.");
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleRepoChange = (e) => {
    setSelectedRepoStr(e.target.value);
  };

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
      
      // Update Github Repo Link if chosen
      if (selectedRepoStr) {
        try {
          const selectedObj = JSON.parse(selectedRepoStr);
          if (selectedObj.id) {
            const token = localStorage.getItem("token");
            await fetch(`http://localhost:8080/api/github/link-repo`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                projectId: projectData._id,
                repoId: selectedObj.id,
                repoName: selectedObj.full_name || selectedObj.name,
                repoUrl: selectedObj.html_url || selectedObj.url
              })
            });
          }
        } catch(e) {
          console.error(e);
        }
      }

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

        <div className="grid md:grid-cols-2 gap-4">
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

        {/* GitHub Integration Section - Chỉ hiển thị cho Quản lý dự án (hoặc Admin) */}
        {canEditGeneralInfo && (
          <div className="pt-4 border-t border-neutral-200">
            <h3 className="text-md font-semibold text-neutral-800 mb-4">GitHub Integration</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg bg-neutral-50">
                <div>
                  <p className="font-medium text-neutral-800">Link GitHub Account</p>
                  <p className="text-sm text-neutral-500">
                    Enable automatic task updates when commits are pushed to GitHub
                  </p>
                </div>
                <Button type="button" onClick={connectToGithub} variant="outline">
                  Connect to GitHub
                </Button>
              </div>

              {/* List repositories if user wants to link */}
              <div className="p-4 border border-neutral-200 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <p className="font-medium text-neutral-800">Link Repository to Project</p>
                  <Button type="button" onClick={fetchGithubRepos} disabled={isLoadingRepos} size="sm" variant="secondary">
                    {isLoadingRepos ? "Loading..." : "Fetch Repositories"}
                  </Button>
                </div>

                {isGithubConnected && githubRepos.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-neutral-700">Select Repository</label>
                    <select
                      value={selectedRepoStr}
                      onChange={handleRepoChange}
                      className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">-- No link/Unlink --</option>
                      {githubRepos.map(repo => (
                        <option key={repo.id} value={JSON.stringify(repo)}>
                          {repo.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Show currently linked repo if any */}
                {selectedRepoStr && selectedRepoStr !== "" && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"></path></svg>
                    Selected: {JSON.parse(selectedRepoStr).name || JSON.parse(selectedRepoStr).full_name}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {canSaveChanges && (
          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            <Button variant="secondary" type="button" onClick={handleCancel} disabled={!hasChanges()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
};

export default ProjectSettingsGeneral;
