import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import platformService from "../../services/platformService";
import * as FaIcons from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import IconPicker from "../../components/Setting/IconPicker";
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
  const Icon = FaIcons[name];
  if (!Icon) return <FaIcons.FaQuestionCircle />;
  return <Icon />;
};
export const SettingsPlatforms = () => {
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [platformToDelete, setPlatformToDelete] = useState(null);

  const fetchPlatforms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await platformService.getAllPlatforms();
      setPlatforms(response.data);
    } catch (error) {
      toast.error("Failed to fetch platforms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  const handleOpenModal = (platform = null) => {
    setCurrentPlatform(platform ? { ...platform } : { name: "", icon: "FaCode" });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentPlatform((prev) => ({ ...prev, [name]: value }));
  };

  const handleIconSelect = (iconName) => {
    setCurrentPlatform((prev) => ({ ...prev, icon: iconName }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = {
      name: currentPlatform.name,
      icon: currentPlatform.icon,
    };
    try {
      if (currentPlatform._id) {
        await platformService.updatePlatform(currentPlatform._id, payload);
        toast.success("Platform updated successfully!");
      } else {
        await platformService.createPlatform(payload);
        toast.success("Platform created successfully!");
      }
      handleCloseModal();
      fetchPlatforms();
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (platform) => {
    setPlatformToDelete(platform);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await platformService.deletePlatform(platformToDelete._id || platformToDelete);
      toast.success("Platform deleted successfully!");
      setIsDeleteModalOpen(false);
      setPlatformToDelete(null);
      fetchPlatforms();
    } catch (error) {
      toast.error("Failed to delete platform.");
    }
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner"></div>
        <p>Loading platforms...</p>
      </div>
    );
  }

  return (
    <div className="settings-page-container">
      <div className="settings-page-header">
        <div className="header-left">
          <h2>Platforms</h2>
          <p>{platforms.length} platforms configured</p>
        </div>
        {user.role === "admin" && (
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
              <div className="card-icon" style={{ backgroundColor: iconInfo?.color || "#4BADE8" }}>
                <IconComponent name={p.icon} />
              </div>
              <div className="card-content">
                <h3 className="card-title">{p.name}</h3>
                <p className="card-description">{p.description || "No description"}</p>
                {p.projectId && <span className="card-badge">Project-specific</span>}
                {!p.projectId && <span className="card-badge default">Default</span>}
              </div>
              {!p.projectId && user.role === "admin" && (
                <div className="card-actions">
                  <button className="btn-icon-action" onClick={() => handleOpenModal(p)} title="Edit">
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button className="btn-icon-action delete" onClick={() => handleDeleteClick(p)} title="Delete">
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
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={currentPlatform.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Web, Mobile, Desktop"
                  />
                </div>
                <div className="form-group">
                  <label>Icon</label>
                  <IconPicker
                    icons={PREDEFINED_PLATFORM_ICONS.map((icon) => ({
                      ...icon,
                      component: <IconComponent name={icon.name} />,
                    }))}
                    selectedIcon={currentPlatform.icon}
                    onSelect={handleIconSelect}
                  />
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
          setPlatformToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Platform"
        message={`Are you sure you want to delete "${platformToDelete?.name}"?`}
      />
    </div>
  );
};

export default SettingsPlatforms;
