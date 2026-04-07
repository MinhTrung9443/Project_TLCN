import React, { useState, useEffect } from "react";
import { createProject } from "../../services/projectService";
import userService from "../../services/userService";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";

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
        <div className="sticky top-0 bg-white border-b border-neutral-200 p-6 flex items-start justify-between z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
              <span className="material-symbols-outlined text-2xl">folder_open</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">Create New Project</h2>
              <p className="text-sm text-neutral-600 mt-1">Set up your project workspace</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Input
                label="Project Name"
                name="name"
                id="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter project name"
                required
              />
            </div>

            <div>
              <Input
                label="Key"
                name="key"
                id="key"
                type="text"
                value={formData.key}
                onChange={handleInputChange}
                placeholder="e.g., PROJ"
                required
              />
            </div>

            <div>
              <Select label="Type" name="type" id="type" value={formData.type} onChange={handleInputChange} required>
                <option value="Scrum">Scrum</option>
                <option value="Kanban">Kanban</option>
              </Select>
            </div>

            <div>
              <Select
                label="Project Manager"
                name="projectManagerId"
                id="projectManagerId"
                value={formData.projectManagerId}
                onChange={handleInputChange}
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
              </Select>
            </div>

            <div>
              <Input label="Start Date" name="startDate" id="startDate" type="date" value={formData.startDate} onChange={handleInputChange} />
            </div>

            <div>
              <Input
                label="End Date"
                name="endDate"
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleInputChange}
                error={dateError}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-200">
            <Button type="button" variant="secondary" size="md" onClick={handleClose} icon="close">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={isSubmitting} icon={isSubmitting ? "sync" : "check_circle"}>
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
