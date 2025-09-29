import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import platformService from "../../services/platformService"; // Service cho Platform
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
import { useAuth } from "../../contexts/AuthContext"; 
import "../../styles/pages/ManageProject/ProjectSettings_TaskType.css";

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

// IconPicker giờ sẽ nhận danh sách icons làm props
const IconPicker = ({ selectedIcon, onSelect, icons }) => {
  return (
    <div className="icon-picker-container">
      {icons.map((icon) => (
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

// --- COMPONENT CHÍNH ---
export const SettingsPlatforms = () => {
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState(null);

  const fetchPlatforms = useCallback(async () => {
    try {
      setLoading(true);
      // Gọi API lấy TẤT CẢ platform (không cần projectKey)
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

  const handleDelete = async (platformId) => {
    if (window.confirm("Are you sure you want to delete this platform?")) {
      try {
        await platformService.deletePlatform(platformId);
        toast.success("Platform deleted successfully!");
        fetchPlatforms();
      } catch (error) {
        toast.error("Failed to delete platform.");
      }
    }
  };

  const handleEditClick = (e, platform) => {
    e.stopPropagation();
    handleOpenModal(platform);
  };

  const handleDeleteClick = (e, platformId) => {
    e.stopPropagation();
    handleDelete(platformId);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="settings-list-container">
      <div className="settings-list-header">
        <div className="header-col col-icon">Icon</div>
        <div className="header-col col-name">Platform Name</div>
        <div className="header-col col-description">Description</div>
        {user.role === "admin" && (<div className="header-col col-actions">
          <button className="btn-add-icon" onClick={() => handleOpenModal()}>
            <VscIcons.VscAdd />
          </button>
        </div>)}
      </div>

      <div className="settings-list-body">
        {platforms.map((p) => {
          const iconInfo = PREDEFINED_PLATFORM_ICONS.find((i) => i.name === p.icon);
          return (
            <div className="settings-list-row" key={p._id}>
              <div className="row-col col-icon">
                <span className="icon-wrapper" style={{ backgroundColor: iconInfo?.color || "#4BADE8" }}>
                  <IconComponent name={p.icon} />
                </span>
              </div>
              <div className="row-col col-name">{p.name}</div>
              <div className="row-col col-description">{p.description || "-"}</div>
              <div className="row-col col-project">{p.projectId ? p.projectId.name : <span className="default-badge">Default</span>}</div>
              {!p.projectId && user.role === "admin" && (
                <div className="row-col col-actions">
                  <button className="btn-edit" onClick={(e) => handleEditClick(e, p)}>
                    <FaIcons.FaPencilAlt />
                  </button>
                  <button className="btn-delete" onClick={(e) => handleDeleteClick(e, p._id)}>
                    <FaIcons.FaTrash />
                  </button>
                </div>
              )}
              {p.projectId && user.role === "admin" && (
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
            <h2>{currentPlatform?._id ? "Edit Platform" : "Create Platform"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name*</label>
                <input id="name" name="name" value={currentPlatform.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Icon</label>
                <IconPicker
                  selectedIcon={currentPlatform.icon}
                  onSelect={handleIconSelect}
                  icons={PREDEFINED_PLATFORM_ICONS} // Truyền danh sách icon vào
                />
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

export default SettingsPlatforms;
