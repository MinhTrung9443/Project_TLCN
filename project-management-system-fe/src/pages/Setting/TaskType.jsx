import React, { useState, useEffect, useCallback } from "react";
// KHÔNG CẦN useParams ở đây vì đây là trang global
import { toast } from "react-toastify";
import typeTaskService from "../../services/typeTaskService";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
import "../../styles/pages/ManageProject/ProjectSettings_TaskType.css";
import { useAuth } from "../../contexts/AuthContext";
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

const SettingTaskTypePage = () => {
  // Tên component cho trang Global Settings
  const { user } = useAuth();
  const [taskTypes, setTaskTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTaskType, setCurrentTaskType] = useState(null);

  const fetchTaskTypes = useCallback(async () => {
    try {
      setLoading(true);
      // Service này không cần projectKey
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
      // Khi tạo mới từ trang global, nó là item mặc định nên projectId = null
      projectId: currentTaskType.projectId || null,
    };
    try {
      if (currentTaskType._id) {
        await typeTaskService.updateTypeTask(currentTaskType._id, payload);
        toast.success("Task type updated successfully!");
      } else {
        // Không truyền projectKey, vì đây là tạo mới cho hệ thống
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

  const handleDelete = async (taskTypeId) => {
    if (window.confirm("Are you sure you want to delete this task type? This might affect projects using it.")) {
      try {
        await typeTaskService.deleteTypeTask(taskTypeId);
        toast.success("Task type deleted successfully!");
        fetchTaskTypes();
      } catch (error) {
        toast.error("Failed to delete task type.");
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="settings-list-container">
      <div className="settings-list-header">
        <div className="header-col col-icon">Icon</div>
        <div className="header-col col-name">Task Type</div>
        <div className="header-col col-description">Description</div>
        {user.role === "admin" && (
          <div className="header-col col-actions">
            <button className="btn-add-icon" onClick={() => handleOpenModal()}>
              <VscIcons.VscAdd />
            </button>
          </div>
        )}
      </div>

      <div className="settings-list-body">
        {" "}
        {/* Bọc trong một div để có style nhất quán */}
        {taskTypes.map((tt) => {
          const iconInfo = PREDEFINED_ICONS.find((i) => i.name === tt.icon);
          const iconColor = iconInfo ? iconInfo.color : "#4BADE8";
          return (
            <div className="settings-list-row" key={tt._id}>
              <div className="row-col col-icon">
                <span className="icon-wrapper" style={{ backgroundColor: iconColor }}>
                  <IconComponent name={tt.icon} />
                </span>
              </div>
              <div className="row-col col-name">{tt.name}</div>
              <div className="row-col col-description">{tt.description || "-"}</div>
              {/* THÊM CỘT PROJECT */}
              <div className="row-col col-project">{tt.projectId ? tt.projectId.name : <span className="default-badge">Default</span>}</div>
              {user.role === "admin" && !tt.projectId && (
                <div className="row-col col-actions">
                  <button className="btn-edit" onClick={() => handleOpenModal(tt)}>
                    <FaIcons.FaPencilAlt />
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(tt._id)}>
                    <FaIcons.FaTrash />
                  </button>
                </div>
              )}
              {user.role === "admin" && tt.projectId && (
                <div className="row-col col-actions">
                  <span className="menu-item-disabled">Managed in Project</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{currentTaskType?._id ? "Edit Default Task Type" : "Create Default Task Type"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Task Type*</label>
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
    </div>
  );
};

export default SettingTaskTypePage;
