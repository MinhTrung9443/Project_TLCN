import React, { useState, useEffect } from "react";
import { createProject } from "../../services/projectService";
import userService from "../../services/userService";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";

const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const { user: currentUser } = useAuth();
  const getInitialFormData = () => ({
    name: "",
    key: "",
    type: "Scrum",
    startDate: "",
    endDate: "",
    projectManagerId: currentUser?._id || "",
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [users, setUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState("");
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          const response = await userService.fetchAllUsers();
          if (Array.isArray(response)) {
            setUsers(response);
          } else {
            toast.error("User data format from server is incorrect.");
          }
        } catch (error) {
          toast.error("Could not load users list.");
        }
      };
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const resetForm = () => {
    setFormData(getInitialFormData());
    setDateError("");
    setIsKeyManuallyEdited(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    const updatedFormData = { ...formData, [name]: value };

    if (name === "name" && !isKeyManuallyEdited) {
      const newKey = value
        .trim()
        .toUpperCase()
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .slice(0, 10);
      updatedFormData.key = newKey;
    } else if (name === "key") {
      setIsKeyManuallyEdited(true);
    }

    if (name === "startDate" || name === "endDate") {
      const start = new Date(updatedFormData.startDate);
      const end = new Date(updatedFormData.endDate);

      if (updatedFormData.startDate && updatedFormData.endDate && start > end) {
        setDateError("End Date must be on or after the Start Date.");
      } else {
        setDateError("");
      }
    }

    setFormData(updatedFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.key || !formData.type || !formData.projectManagerId) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (dateError) {
      toast.error(dateError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createProject(formData);
      toast.success("Project created successfully!");
      onProjectCreated(response.data);
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              <span className="material-symbols-outlined text-2xl">folder_open</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Project</h2>
              <p className="text-sm text-gray-600 mt-1">Set up your project workspace</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <span className="material-symbols-outlined text-base">title</span>
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter project name"
                required
              />
            </div>

            <div>
              <label htmlFor="key" className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <span className="material-symbols-outlined text-base">key</span>
                Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="key"
                id="key"
                value={formData.key}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., PROJ"
                required
              />
            </div>

            <div>
              <label htmlFor="type" className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <span className="material-symbols-outlined text-base">category</span>
                Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                id="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="Scrum">Scrum</option>
                <option value="Kanban">Kanban</option>
              </select>
            </div>

            <div>
              <label htmlFor="projectManagerId" className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <span className="material-symbols-outlined text-base">person</span>
                Project Manager <span className="text-red-500">*</span>
              </label>
              <select
                name="projectManagerId"
                id="projectManagerId"
                value={formData.projectManagerId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="" disabled>
                  Select a manager
                </option>
                {Array.isArray(users) &&
                  users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.username}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="startDate" className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                id="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                <span className="material-symbols-outlined text-base">event</span>
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                id="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {dateError && (
                <p className="flex items-center gap-1 text-sm text-red-600 mt-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {dateError}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-2 px-6 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`material-symbols-outlined ${isSubmitting ? "animate-spin" : ""}`}>{isSubmitting ? "sync" : "check_circle"}</span>
              {isSubmitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
