import React, { useState, useEffect, useCallback } from "react";
import * as FaIcons from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import platformService from "../../services/platformService";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import IconPicker from "../../components/Setting/IconPicker";

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
      <div className="py-24">
        <LoadingSpinner size="lg" text="Loading platforms..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <PageHeader
        title="Platforms"
        subtitle="Define where your products run and manage project-specific platforms"
        icon="devices_other"
        badge={`${platforms.length} total`}
        actions={
          user.role === "admin" ? (
            <Button icon="add" onClick={() => handleOpenModal()}>
              Create platform
            </Button>
          ) : null
        }
      />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Card header={<div className="text-sm text-neutral-600">Use platforms to categorize tasks by technology or target.</div>}>
          {platforms.length === 0 ? (
            <EmptyState
              icon="devices_other"
              title="No platforms yet"
              description="Create platforms like Web, iOS, Android, or Desktop to organize your work."
              action={
                user.role === "admin" ? (
                  <Button icon="add" onClick={() => handleOpenModal()}>
                    Create platform
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {platforms.map((p) => {
                const iconInfo = PREDEFINED_PLATFORM_ICONS.find((i) => i.name === p.icon);
                return (
                  <Card
                    key={p._id}
                    hoverable
                    className="h-full"
                    header={
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl shadow"
                            style={{ backgroundColor: iconInfo?.color || "#4BADE8" }}
                          >
                            <IconComponent name={p.icon} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-neutral-900">{p.name}</h3>
                            <p className="text-sm text-neutral-500">Platform level {p.level || 1}</p>
                          </div>
                        </div>
                        {p.projectId && (
                          <Badge variant="primary" size="sm" icon="hub">
                            Project
                          </Badge>
                        )}
                      </div>
                    }
                    footer={
                      !p.projectId && user.role === "admin" ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="secondary" size="sm" icon="edit" onClick={() => handleOpenModal(p)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-accent-600 hover:bg-accent-50"
                            icon="delete"
                            onClick={() => handleDeleteClick(p)}
                          >
                            Delete
                          </Button>
                        </div>
                      ) : null
                    }
                  >
                    <p className="text-sm text-neutral-600 line-clamp-3">{p.description || "No description"}</p>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-neutral-500">Platform</p>
                <h2 className="text-lg font-semibold text-neutral-900">{currentPlatform?._id ? "Edit platform" : "Create platform"}</h2>
              </div>
              <Button variant="ghost" size="sm" icon="close" onClick={handleCloseModal} />
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-neutral-800">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={currentPlatform?.name || ""}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Web, Mobile, Desktop"
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-800">Icon</p>
                <IconPicker
                  icons={PREDEFINED_PLATFORM_ICONS.map((icon) => ({
                    ...icon,
                    component: <IconComponent name={icon.name} />,
                  }))}
                  selectedIcon={currentPlatform?.icon || "FaCode"}
                  onSelect={handleIconSelect}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-200">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} icon="save">
                  {isSaving ? "Saving..." : "Save"}
                </Button>
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
