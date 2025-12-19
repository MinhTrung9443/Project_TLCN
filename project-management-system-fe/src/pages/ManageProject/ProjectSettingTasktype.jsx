import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import typeTaskService from "../../services/typeTaskService";
import { getProjectByKey } from "../../services/projectService";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import "../../styles/pages/ManageProject/ProjectSettings_TaskType.css";
import { useAuth } from "../../contexts/AuthContext";
const PREDEFINED_ICONS = [
  { name: "FaTasks", color: "#4BADE8" },
  { name: "FaStar", color: "#2ECC71" },
  { name: "FaCheckSquare", color: "#5297FF" },
  { name: "FaRegWindowMaximize", color: "#00A8A2" }, // Giống Sub Task
  { name: "FaBug", color: "#E44D42" },
  { name: "FaArrowUp", color: "#F57C00" }, // Giống Improvement
  { name: "FaBullseye", color: "#654DF7" }, // Giống Feature
  { name: "FaQuestionCircle", color: "#7A869A" },
  { name: "FaRegClone", color: "#4BADE8" }, // Giống Task Template
  { name: "FaFileAlt", color: "#00B8D9" },
];

const IconComponent = ({ name }) => {
  const AllIcons = { ...FaIcons, ...VscIcons };
  const Icon = AllIcons[name];
  if (!Icon) return <FaIcons.FaQuestionCircle />;
  return <Icon />;
};

const IconPicker = ({ selectedIcon, onSelect }) => {
  return (
    <div className="icon-picker-container">
      {PREDEFINED_ICONS.map((icon) => (
        <button
          key={icon.name}
          type="button"
          className={`icon-picker-button ${selectedIcon === icon.name ? "selected" : ""}`}
          onClick={() => onSelect(icon.name)}
        >
          <div className="icon-display" style={{ backgroundColor: icon.color }}>
            <IconComponent name={icon.name} />
          </div>
        </button>
      ))}
    </div>
  );
};

const ProjectSettingTaskType = () => {
  const { user } = useAuth();
  const { projectKey } = useParams();
  const [taskTypes, setTaskTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTaskType, setCurrentTaskType] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTaskTypeId, setDeleteTaskTypeId] = useState(null);
  const [userProjectRole, setUserProjectRole] = useState(null);

  const fetchTaskTypes = useCallback(async () => {
    try {
      setLoading(true);
      const [taskTypesRes, projectRes] = await Promise.all([typeTaskService.getAllTypeTask(projectKey), getProjectByKey(projectKey)]);
      setTaskTypes(taskTypesRes.data);

      // Determine user's role in project
      const project = projectRes.data;
      const userId = user?._id;
      const member = project.members?.find((m) => m.userId?._id === userId || m.userId === userId);
      setUserProjectRole(member?.role || null);
    } catch (error) {
      toast.error("Failed to fetch task types.");
    } finally {
      setLoading(false);
    }
  }, [projectKey, user]);

  useEffect(() => {
    fetchTaskTypes();
  }, [fetchTaskTypes]);

  const handleOpenModal = (taskType = null) => {
    setCurrentTaskType(taskType ? { ...taskType } : { name: "", icon: "FaTasks", description: "" });
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentTaskType((prev) => ({ ...prev, [name]: value }));
  };

  const handleIconSelect = (iconName) => {
    setCurrentTaskType((prev) => ({ ...prev, icon: iconName }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = {
      name: currentTaskType.name,
      icon: currentTaskType.icon,
      description: currentTaskType.description,
    };
    try {
      if (currentTaskType._id) {
        await typeTaskService.updateTypeTask(currentTaskType._id, payload);
        toast.success("Task type updated successfully!");
      } else {
        await typeTaskService.createTypeTask({ ...payload, projectKey });
        toast.success("Task type created successfully!");
      }
      handleCloseModal();
      fetchTaskTypes();
    } catch (error) {
      toast.error(error.response?.data?.error || "An error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await typeTaskService.deleteTypeTask(deleteTaskTypeId);
      toast.success("Task type deleted successfully!");
      fetchTaskTypes();
      setIsDeleteModalOpen(false);
      setDeleteTaskTypeId(null);
    } catch (error) {
      toast.error("Failed to delete task type.");
    }
  };

  const canEdit = user?.role === "admin" || userProjectRole === "PROJECT_MANAGER";

  if (loading) return <div>Loading...</div>;

  return (
    <div className="settings-list-container">
      <div className="settings-list-header">
        <div className="header-col col-icon">Icon</div>
        <div className="header-col col-name">Task Type</div>
        <div className="header-col col-description">Description</div>
        {canEdit && (
          <div className="header-col col-actions">
            <button className="btn-add-icon" onClick={() => handleOpenModal()}>
              <VscIcons.VscAdd />
            </button>
          </div>
        )}
      </div>
      <div className="settings-list-body">
        {taskTypes.map((tt) => {
          const iconInfo = PREDEFINED_ICONS.find((i) => i.name === tt.icon);
          const iconColor = iconInfo ? iconInfo.color : "#4BADE8"; // Màu mặc định
          return (
            <div className="settings-list-row" key={tt._id}>
              <div className="row-col col-icon">
                <span className="icon-wrapper" style={{ backgroundColor: iconColor }}>
                  <IconComponent name={tt.icon} />
                </span>
              </div>
              <div className="row-col col-name">{tt.name}</div>
              <div className="row-col col-description">{tt.description || "-"}</div>
              {canEdit && (
                <div className="row-col col-actions">
                  <button className="btn-edit" onClick={() => handleOpenModal(tt)}>
                    <FaIcons.FaPencilAlt />
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => {
                      setDeleteTaskTypeId(tt._id);
                      setIsDeleteModalOpen(true);
                    }}
                  >
                    <FaIcons.FaTrash />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{currentTaskType._id ? "Edit Task Type" : "Create Task Type"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name" className="required">
                  Task Type
                </label>
                <input id="name" name="name" value={currentTaskType.name} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>Icon</label>
                <IconPicker selectedIcon={currentTaskType.icon} onSelect={handleIconSelect} />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea id="description" name="description" rows="3" value={currentTaskType.description || ""} onChange={handleChange}></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTaskTypeId(null);
        }}
        onConfirm={handleDelete}
        title="Delete Task Type"
        message="Are you sure you want to delete this task type? This might affect projects using it."
      />
    </div>
  );
};

export default ProjectSettingTaskType;
