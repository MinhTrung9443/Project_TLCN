import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import platformService from "../../services/platformService";
import { getProjectByKey } from "../../services/projectService";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
import { useAuth } from "../../contexts/AuthContext";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import "../../styles/Setting/SettingsPage.css";

const PREDEFINED_PLATFORM_ICONS = [
  { name: "FaCode", color: "#8E44AD" },
  { name: "FaCog", color: "#E74C3C" },
  { name: "FaCubes", color: "#27AE60" },
  { name: "FaExpandArrowsAlt", color: "#3498DB" },
  { name: "FaApple", color: "#95A5A6" },
  { name: "FaAndroid", color: "#2ECC71" },
  { name: "FaChartBar", color: "#34495E" },
  { name: "FaTerminal", color: "#F1C40F" },
  { name: "FaPalette", color: "#9B59B6" },
  { name: "FaFlask", color: "#C0392B" },
];
const IconComponent = ({ name }) => {
  const AllIcons = { ...FaIcons, ...VscIcons };
  const Icon = AllIcons[name];
  if (!Icon) return <FaIcons.FaQuestionCircle />;
  return <Icon />;
};

const IconPicker = ({ selectedIcon, onSelect }) => (
  <div className="icon-picker-container">
    {PREDEFINED_PLATFORM_ICONS.map((icon) => (
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

const ProjectSettingPlatform = () => {
  const { user } = useAuth();
  const { projectKey } = useParams();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePlatformId, setDeletePlatformId] = useState(null);
  const [userProjectRole, setUserProjectRole] = useState(null);

  const fetchPlatforms = useCallback(async () => {
    try {
      setLoading(true);
      const [platformsRes, projectRes] = await Promise.all([platformService.getAllPlatforms(projectKey), getProjectByKey(projectKey)]);
      setPlatforms(platformsRes.data);

      // Determine user's role in project
      const project = projectRes.data;
      const userId = user?._id;
      const member = project.members?.find((m) => m.userId?._id === userId || m.userId === userId);
      setUserProjectRole(member?.role || null);
    } catch (error) {
      toast.error("Failed to fetch platforms.");
    } finally {
      setLoading(false);
    }
  }, [projectKey, user]);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  const handleOpenModal = (platform = null) => {
    setCurrentPlatform(platform ? { ...platform } : { name: "", icon: "FaCode", description: "" });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = {
      name: currentPlatform.name,
      icon: currentPlatform.icon,
      description: currentPlatform.description,
      projectKey: projectKey,
    };
    try {
      if (currentPlatform._id) {
        await platformService.updatePlatform(currentPlatform._id, payload);
        toast.success("Platform updated!");
      } else {
        await platformService.createPlatform(payload);
        toast.success("Platform created!");
      }
      setIsModalOpen(false);
      fetchPlatforms();
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await platformService.deletePlatform(deletePlatformId);
      toast.success("Platform deleted!");
      fetchPlatforms();
      setIsDeleteModalOpen(false);
      setDeletePlatformId(null);
    } catch (error) {
      toast.error("Failed to delete platform.");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentPlatform((prev) => ({ ...prev, [name]: value }));
  };

  const handleIconSelect = (iconName) => {
    setCurrentPlatform((prev) => ({ ...prev, icon: iconName }));
  };

  const canEdit = user?.role === "admin" || userProjectRole === "PROJECT_MANAGER";

  if (loading) return <div>Loading...</div>;

  return (
    <div className="settings-page-container">
      <div className="settings-page-header">
        <div className="header-left">
          <h2>Platforms</h2>
          <p>{platforms.length} platforms configured</p>
        </div>
        {canEdit && (
          <button className="btn-create" onClick={() => handleOpenModal()}>
            <span className="material-symbols-outlined">add</span>
            Create Platform
          </button>
        )}
      </div>

      <div className="settings-grid">
        {platforms.map((p) => {
          const iconInfo = PREDEFINED_PLATFORM_ICONS.find((i) => i.name === p.icon);
          return (
            <div className="settings-card" key={p._id}>
              <div className="card-icon" style={{ backgroundColor: iconInfo?.color || "#7A869A" }}>
                <IconComponent name={p.icon} />
              </div>
              <div className="card-content">
                <h3 className="card-title">{p.name}</h3>
                <p className="card-description">{p.description || "No description"}</p>
              </div>
              {canEdit && (
                <div className="card-actions">
                  <button className="btn-icon-action" onClick={() => handleOpenModal(p)} title="Edit">
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    className="btn-icon-action delete"
                    onClick={() => {
                      setDeletePlatformId(p._id);
                      setIsDeleteModalOpen(true);
                    }}
                    title="Delete"
                  >
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
              <h2>{currentPlatform?._id ? "Edit Platform" : "Create Platform"}</h2>
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
                  <input id="name" name="name" value={currentPlatform.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Icon</label>
                  <IconPicker selectedIcon={currentPlatform.icon} onSelect={handleIconSelect} />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea id="description" name="description" rows="3" value={currentPlatform.description || ""} onChange={handleChange}></textarea>
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
          setDeletePlatformId(null);
        }}
        onConfirm={handleDelete}
        title="Delete Platform"
        message="Are you sure you want to delete this platform? This might affect projects using it."
      />
    </div>
  );
};

export default ProjectSettingPlatform;
