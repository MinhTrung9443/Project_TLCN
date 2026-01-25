import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import { getProjects } from "../../services/projectService";
import { getCreateTaskFormData } from "../../services/settingsService";
import { createTask } from "../../services/taskService";
import RichTextEditor from "../common/RichTextEditor";

const INITIAL_FORM_STATE = {
  projectId: "",
  taskTypeId: "",
  name: "",
  description: "",
  priorityId: "",
  assigneeId: "",
  reporterId: "",

  startDate: "",
  dueDate: "",
  platformId: "",
  sprintId: "",
};

// FIX 1: Đặt giá trị mặc định cho sprint là null để an toàn hơn
const CreateTaskModal = ({ sprint = null, isOpen, onClose, onTaskCreated, defaultProjectId = null }) => {
  const { user } = useAuth();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [projects, setProjects] = useState([]);
  const [settings, setSettings] = useState({ taskTypes: [], priorities: [], members: [], platforms: [] });
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      const fetchAllProjects = async () => {
        try {
          const res = await getProjects();
          let availableProjects = res.data;

          // Filter projects based on user role
          if (user.role !== "admin") {
            // Non-admin users can only create tasks in projects where they are PM or Leader
            availableProjects = res.data.filter((project) => {
              // Check if PM
              const isPM = project.members?.some(
                (member) => (member.userId._id === user._id || member.userId === user._id) && member.role === "PROJECT_MANAGER",
              );

              // Check if Leader
              const isLeader = project.teams?.some((team) => team.leaderId._id === user._id || team.leaderId === user._id);

              return isPM || isLeader;
            });
          }

          // Filter out completed projects - only show active projects
          availableProjects = availableProjects.filter((project) => project.status !== "completed");

          setProjects(availableProjects);
          if (defaultProjectId) {
            setFormData((prev) => ({
              ...prev,
              projectId: defaultProjectId, // <-- TỰ ĐỘNG CHỌN PROJECT
              reporterId: user.id,
              sprintId: sprint ? sprint._id : "", // <-- TỰ ĐỘNG CHỌN SPRINT
            }));
          } else {
            // Nếu không, chỉ set reporterId như cũ
            setFormData((prev) => ({
              ...prev,
              reporterId: user.id,
              sprintId: sprint ? sprint._id : "", // <-- TỰ ĐỘNG CHỌN SPRINT
            }));
          }
        } catch (error) {
          toast.error("Could not fetch projects.");
        }
      };
      fetchAllProjects();
    } else {
      // Reset mọi thứ khi modal đóng
      setFormData(INITIAL_FORM_STATE);
      setErrors({});
      setShowMore(false);
    }
  }, [isOpen, user.id, user.role, user._id, sprint, defaultProjectId]); // Bỏ phụ thuộc vào selectedProjectKey

  useEffect(() => {
    const fetchSettingsForProject = async () => {
      if (!formData.projectId) {
        setSettings({ taskTypes: [], priorities: [], members: [], platforms: [] });
        return;
      }

      const selectedProject = projects.find((p) => p._id === formData.projectId);
      if (!selectedProject) return;

      try {
        const res = await getCreateTaskFormData(selectedProject.key);

        // Filter members based on user role
        let filteredMembers = res.data.members;

        if (user.role !== "admin") {
          // Check if user is PM
          const isPM = selectedProject.members?.some(
            (member) => (member.userId._id === user._id || member.userId === user._id) && member.role === "PROJECT_MANAGER",
          );

          if (!isPM) {
            // User is a Leader - can only assign to their team members + themselves
            const userLeadTeams = selectedProject.teams?.filter((team) => team.leaderId._id === user._id || team.leaderId === user._id) || [];

            // Get all team member IDs including the leader themselves
            const teamMemberIds = [user._id.toString()]; // Add leader to the list
            userLeadTeams.forEach((team) => {
              if (team.members && Array.isArray(team.members)) {
                team.members.forEach((member) => {
                  const memberId = member._id || member;
                  if (!teamMemberIds.includes(memberId.toString())) {
                    teamMemberIds.push(memberId.toString());
                  }
                });
              }
            });

            // Filter members to only show team members + leader
            filteredMembers = res.data.members.filter((m) => {
              const userId = m.userId._id || m.userId;
              return teamMemberIds.includes(userId.toString());
            });
          }
        }

        // Keep only active users for assignment
        filteredMembers = (filteredMembers || []).filter((m) => m.userId && m.userId.status !== "inactive");

        setSettings({
          ...res.data,
          members: filteredMembers,
        });

        // Tự động chọn task type đầu tiên nếu có
        if (res.data.taskTypes && res.data.taskTypes.length > 0) {
          setFormData((prev) => ({ ...prev, taskTypeId: res.data.taskTypes[0]._id }));
        }

        // Tự động chọn priority là Medium nếu có
        if (res.data.priorities && res.data.priorities.length > 0) {
          const defaultPriority = res.data.priorities.find((p) => p.name.toLowerCase() === "medium") || res.data.priorities[0];
          setFormData((prev) => ({ ...prev, priorityId: defaultPriority._id }));
        }
      } catch (error) {
        toast.error(`Could not fetch settings for ${selectedProject.name}.`);
      }
    };
    fetchSettingsForProject();
  }, [formData.projectId, projects, user.role, user._id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "projectId") {
      setFormData((prev) => ({
        ...INITIAL_FORM_STATE, // Reset về trạng thái ban đầu
        reporterId: user.id, // Giữ lại reporter
        projectId: value, // Cập nhật projectId mới
        name: prev.name, // Giữ lại tên và mô tả đã gõ
        description: prev.description,
        sprintId: sprint ? sprint._id : "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDescriptionChange = (content) => {
    setFormData((prev) => ({ ...prev, description: content }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.projectId) newErrors.projectId = "Project is required.";
    if (!formData.taskTypeId) newErrors.taskTypeId = "Type is required.";
    if (!formData.name.trim()) newErrors.name = "Task Name is required.";
    if (!formData.priorityId) newErrors.priorityId = "Priority is required.";

    // Get selected project
    const selectedProject = projects.find((p) => p._id === formData.projectId);

    // Debug logging
    console.log("=== VALIDATION DEBUG ===");
    console.log("Selected Project:", selectedProject);
    console.log("Project startDate:", selectedProject?.startDate);
    console.log("Project endDate:", selectedProject?.endDate);
    console.log("Task dueDate:", formData.dueDate);
    console.log("Task startDate:", formData.startDate);
    console.log("Sprint:", sprint);

    // Validate start date <= due date only if both are provided
    if (formData.startDate && formData.dueDate) {
      const startDate = new Date(formData.startDate).setHours(0, 0, 0, 0);
      const dueDate = new Date(formData.dueDate).setHours(0, 0, 0, 0);
      if (startDate > dueDate) {
        newErrors.startDate = "Start date must be before or equal to due date.";
      }
    }

    // Validate due date with project dates only if due date is provided
    if (formData.dueDate && selectedProject) {
      const taskDueDate = new Date(formData.dueDate);
      taskDueDate.setHours(0, 0, 0, 0);

      if (selectedProject.startDate) {
        const projectStartDate = new Date(selectedProject.startDate);
        projectStartDate.setHours(0, 0, 0, 0);
        console.log("Comparing task due date", taskDueDate, "with project start", projectStartDate);
        if (taskDueDate < projectStartDate) {
          console.log("ERROR: Task due date before project start!");
          newErrors.dueDate = `Due date must be on or after project start date (${projectStartDate.toLocaleDateString()})`;
        }
      }

      if (selectedProject.endDate && !newErrors.dueDate) {
        const projectEndDate = new Date(selectedProject.endDate);
        projectEndDate.setHours(0, 0, 0, 0);
        console.log("Comparing task due date", taskDueDate, "with project end date", projectEndDate);
        if (taskDueDate > projectEndDate) {
          console.log("ERROR: Task due date after project end date!");
          newErrors.dueDate = `Due date must be on or before project end date (${projectEndDate.toLocaleDateString()})`;
        }
      }
    }

    // Validate start date with project dates if provided
    if (formData.startDate && selectedProject && !newErrors.startDate) {
      const taskStartDate = new Date(formData.startDate);
      taskStartDate.setHours(0, 0, 0, 0);

      if (selectedProject.startDate) {
        const projectStartDate = new Date(selectedProject.startDate);
        projectStartDate.setHours(0, 0, 0, 0);
        if (taskStartDate < projectStartDate) {
          newErrors.startDate = `Start date must be on or after project start date (${projectStartDate.toLocaleDateString()})`;
        }
      }

      if (selectedProject.endDate && !newErrors.startDate) {
        const projectEndDate = new Date(selectedProject.endDate);
        projectEndDate.setHours(0, 0, 0, 0);
        if (taskStartDate > projectEndDate) {
          newErrors.startDate = `Start date must be on or before project end date (${projectEndDate.toLocaleDateString()})`;
        }
      }
    }

    // Additional validation: if creating in a sprint and due date is provided, validate with sprint dates
    if (sprint && formData.dueDate && !newErrors.dueDate) {
      const taskDueDate = new Date(formData.dueDate);
      const sprintStartDate = new Date(sprint.startDate);
      const sprintEndDate = new Date(sprint.endDate);

      taskDueDate.setHours(0, 0, 0, 0);
      sprintStartDate.setHours(0, 0, 0, 0);
      sprintEndDate.setHours(0, 0, 0, 0);

      if (taskDueDate < sprintStartDate || taskDueDate > sprintEndDate) {
        newErrors.dueDate = `Due date must be between ${sprintStartDate.toLocaleDateString()} and ${sprintEndDate.toLocaleDateString()}`;
      }
    }

    if (sprint && formData.startDate && !newErrors.startDate) {
      const taskStartDate = new Date(formData.startDate);
      const sprintStartDate = new Date(sprint.startDate);
      const sprintEndDate = new Date(sprint.endDate);

      taskStartDate.setHours(0, 0, 0, 0);
      sprintStartDate.setHours(0, 0, 0, 0);
      sprintEndDate.setHours(0, 0, 0, 0);

      if (taskStartDate < sprintStartDate || taskStartDate > sprintEndDate) {
        newErrors.startDate = `Start date must be between ${sprintStartDate.toLocaleDateString()} and ${sprintEndDate.toLocaleDateString()}`;
      }
    }

    console.log("Validation Errors:", newErrors);
    console.log("=== END VALIDATION ===");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the validation errors before submitting.");
      return;
    }

    setLoading(true);
    try {
      // 1. Tìm project đã chọn từ danh sách projects
      const selectedProject = projects.find((p) => p._id === formData.projectId);

      // 2. Kiểm tra xem có tìm thấy project không
      if (!selectedProject) {
        toast.error("Invalid project selected.");
        setLoading(false);
        return;
      }

      // 3. Chuẩn bị payload, loại bỏ các trường rỗng
      const payload = { ...formData };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") {
          delete payload[key];
        }
      });

      // 4. Gọi hàm createTask với 2 tham số: projectKey và payload
      const res = await createTask(selectedProject.key, payload);

      toast.success("Task created successfully!");
      onTaskCreated(res.data);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create task.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between border-b border-purple-800">
          <h2 className="text-xl font-bold">Create Task</h2>
          <button onClick={onClose} className="text-white hover:bg-purple-600 p-2 rounded-lg transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="projectId" className="block text-sm font-semibold text-gray-900 mb-2">
                  Project <span className="text-red-600">*</span>
                </label>
                <select
                  id="projectId"
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleInputChange}
                  disabled={!!defaultProjectId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.projectId && <p className="text-sm text-red-600 mt-1">{errors.projectId}</p>}
              </div>
              <div>
                <label htmlFor="taskTypeId" className="block text-sm font-semibold text-gray-900 mb-2">
                  Type <span className="text-red-600">*</span>
                </label>
                <select
                  id="taskTypeId"
                  name="taskTypeId"
                  value={formData.taskTypeId}
                  onChange={handleInputChange}
                  disabled={!formData.projectId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Type</option>
                  {settings.taskTypes.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {errors.taskTypeId && <p className="text-sm text-red-600 mt-1">{errors.taskTypeId}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                Task Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
              <RichTextEditor value={formData.description} onChange={handleDescriptionChange} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priorityId" className="block text-sm font-semibold text-gray-900 mb-2">
                  Priority <span className="text-red-600">*</span>
                </label>
                <select
                  id="priorityId"
                  name="priorityId"
                  value={formData.priorityId}
                  onChange={handleInputChange}
                  disabled={!formData.projectId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Priority</option>
                  {settings.priorities.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.priorityId && <p className="text-sm text-red-600 mt-1">{errors.priorityId}</p>}
              </div>
              <div>
                <label htmlFor="dueDate" className="block text-sm font-semibold text-gray-900 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {errors.dueDate && <p className="text-sm text-red-600 mt-1">{errors.dueDate}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="assigneeId" className="block text-sm font-semibold text-gray-900 mb-2">
                  Assignee
                </label>
                <select
                  id="assigneeId"
                  name="assigneeId"
                  value={formData.assigneeId}
                  onChange={handleInputChange}
                  disabled={!formData.projectId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Unassigned</option>
                  {settings.members.map((m) => (
                    <option key={m.userId._id} value={m.userId._id}>
                      {m.userId.fullname}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Reporter</label>
                <input
                  type="text"
                  value={user.fullname}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="button"
              className="px-4 py-2 text-purple-600 font-medium hover:bg-purple-50 rounded-lg transition-colors"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? "Hide" : "Show"} more fields
            </button>

            {showMore && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="platformId" className="block text-sm font-semibold text-gray-900 mb-2">
                    Platform
                  </label>
                  <select
                    id="platformId"
                    name="platformId"
                    value={formData.platformId}
                    onChange={handleInputChange}
                    disabled={!formData.projectId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Platform</option>
                    {settings.platforms.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white font-medium transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-purple-300 border-t-white rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
