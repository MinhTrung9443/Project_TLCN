import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import typeTaskService from "../../services/typeTaskService";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
import IconPicker from "../../components/Setting/IconPicker";
import "../../styles/Setting/SettingsPage.css";
import { useAuth } from "../../contexts/AuthContext";
import ConfirmationModal from "../../components/common/ConfirmationModal";

const PREDEFINED_ICONS = [
  { name: "FaTasks", color: "#4BADE8" },
  { name: "FaStar", color: "#2ECC71" },
  { name: "FaCheckSquare", color: "#5297FF" },
  { name: "FaRegWindowMaximize", color: "#00A8A2" },
  { name: "FaBug", color: "#E44D42" },
  { name: "FaArrowUp", color: "#F57C00" },
  { name: "FaBullseye", color: "#654DF7" },
  { name: "FaQuestionCircle", color: "#7A869A" },
  { name: "FaRegClone", color: "#4BADE8" },
  { name: "FaEquals", color: "#DE350B" },
  { name: "FaFileAlt", color: "#00B8D9" },
];

const IconComponent = ({ name }) => {
  const AllIcons = { ...FaIcons, ...VscIcons };
  const Icon = AllIcons[name];
  if (!Icon) return <FaIcons.FaQuestionCircle />;
  return <Icon />;
};

const SettingTaskTypePage = () => {
  const { user } = useAuth();
  const [taskTypes, setTaskTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTaskType, setCurrentTaskType] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskTypeToDelete, setTaskTypeToDelete] = useState(null);

  const fetchTaskTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await typeTaskService.getAllTypeTask();
      setTaskTypes(response.data);
    } catch (error) {
      toast.error("Failed to fetch task types.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      projectId: currentTaskType.projectId || null,
    };
    try {
      if (currentTaskType._id) {
        await typeTaskService.updateTypeTask(currentTaskType._id, payload);
        toast.success("Task type updated successfully!");
      } else {
        await typeTaskService.createTypeTask(payload);
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

  const handleDeleteClick = (taskType) => {
    setTaskTypeToDelete(taskType);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await typeTaskService.deleteTypeTask(taskTypeToDelete._id);
      toast.success("Task type deleted successfully!");
      setIsDeleteModalOpen(false);
      setTaskTypeToDelete(null);
      fetchTaskTypes();
    } catch (error) {
      toast.error("Failed to delete task type.");
    }
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner"></div>
        <p>Loading task types...</p>
      </div>
    );
  }

  return (
    <div className="settings-page-container">
      <div className="settings-page-header">
        <div className="header-left">
          <h2>Task Types</h2>
          <p>{taskTypes.length} task types configured</p>
        </div>
        {user.role === "admin" && (
          <button className="btn-create" onClick={() => handleOpenModal()}>
            <span className="material-symbols-outlined">add</span>
            Create Task Type
          </button>
        )}
      </div>

      <div className="settings-grid">
        {taskTypes.map((tt) => {
          const iconInfo = PREDEFINED_ICONS.find((i) => i.name === tt.icon);
          const iconColor = iconInfo ? iconInfo.color : "#4BADE8";
          return (
            <div className="settings-card" key={tt._id}>
              <div className="card-icon" style={{ backgroundColor: iconColor }}>
                <IconComponent name={tt.icon} />
              </div>
              <div className="card-content">
                <h3 className="card-title">{tt.name}</h3>
                <p className="card-description">{tt.description || "No description"}</p>
                {tt.projectId && <span className="card-badge">Project-specific</span>}
                {!tt.projectId && <span className="card-badge default">Default</span>}
              </div>
              {user.role === "admin" && !tt.projectId && (
                <div className="card-actions">
                  <button className="btn-icon-action" onClick={() => handleOpenModal(tt)} title="Edit">
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button className="btn-icon-action delete" onClick={() => handleDeleteClick(tt)} title="Delete">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{currentTaskType?._id ? "Edit Task Type" : "Create Task Type"}</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="name">
                    Name <span className="required">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={currentTaskType.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Bug, Feature, Story"
                  />
                </div>
                <div className="form-group">
                  <label>Icon</label>
                  <IconPicker
                    icons={PREDEFINED_ICONS.map((icon) => ({
                      ...icon,
                      component: <IconComponent name={icon.name} />,
                    }))}
                    selectedIcon={currentTaskType.icon}
                    onSelect={handleIconSelect}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    value={currentTaskType.description || ""}
                    onChange={handleChange}
                    placeholder="Optional description"
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
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
          setTaskTypeToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Task Type"
        message={`Are you sure you want to delete "${taskTypeToDelete?.name}"? This might affect projects using it.`}
      />
    </div>
  );
};

export default SettingTaskTypePage;
