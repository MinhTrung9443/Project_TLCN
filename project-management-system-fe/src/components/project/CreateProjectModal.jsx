import React, { useState, useEffect } from "react";
import { createProject } from "../../services/projectService";
import userService from "../../services/userService";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";

import "../../styles/pages/ManageProject/CreateProjectModal.css";

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
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            <div className="modal-icon">
              <span className="material-symbols-outlined">folder_open</span>
            </div>
            <div>
              <h2 className="modal-title">Create New Project</h2>
              <p className="modal-subtitle">Set up your project workspace</p>
            </div>
          </div>
          <button onClick={handleClose} className="modal-close-btn" type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                <span className="material-symbols-outlined">title</span>
                Project Name <span className="required-star">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="key" className="form-label">
                <span className="material-symbols-outlined">key</span>
                Key <span className="required-star">*</span>
              </label>
              <input
                type="text"
                name="key"
                id="key"
                value={formData.key}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g., PROJ"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="type" className="form-label">
                <span className="material-symbols-outlined">category</span>
                Type <span className="required-star">*</span>
              </label>
              <select name="type" id="type" value={formData.type} onChange={handleInputChange} className="form-select" required>
                <option value="Scrum">Scrum</option>
                <option value="Kanban">Kanban</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="projectManagerId" className="form-label">
                <span className="material-symbols-outlined">person</span>
                Project Manager <span className="required-star">*</span>
              </label>
              <select
                name="projectManagerId"
                id="projectManagerId"
                value={formData.projectManagerId}
                onChange={handleInputChange}
                className="form-select"
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

            <div className="form-group">
              <label htmlFor="startDate" className="form-label">
                <span className="material-symbols-outlined">calendar_today</span>
                Start Date
              </label>
              <input type="date" name="startDate" id="startDate" value={formData.startDate} onChange={handleInputChange} className="form-input" />
            </div>

            <div className="form-group">
              <label htmlFor="endDate" className="form-label">
                <span className="material-symbols-outlined">event</span>
                End Date
              </label>
              <input type="date" name="endDate" id="endDate" value={formData.endDate} onChange={handleInputChange} className="form-input" />
              {dateError && (
                <p className="error-message">
                  <span className="material-symbols-outlined">error</span>
                  {dateError}
                </p>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={handleClose} className="modal-btn modal-btn-cancel">
              <span className="material-symbols-outlined">close</span>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="modal-btn modal-btn-primary">
              <span className="material-symbols-outlined">{isSubmitting ? "sync" : "check_circle"}</span>
              {isSubmitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
