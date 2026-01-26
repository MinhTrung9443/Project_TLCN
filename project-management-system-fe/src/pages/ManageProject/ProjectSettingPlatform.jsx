import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import EmptyState from "../../components/ui/EmptyState";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import platformService from "../../services/platformService";
import { getProjectByKey } from "../../services/projectService";
import { useAuth } from "../../contexts/AuthContext";
import ConfirmationModal from "../../components/common/ConfirmationModal";

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
  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
    {PREDEFINED_PLATFORM_ICONS.map((icon) => (
      <button
        key={icon.name}
        type="button"
        className={`p-3 rounded-lg border-2 transition-all ${
          selectedIcon === icon.name ? "border-primary-500 bg-primary-50 shadow-md" : "border-neutral-200 hover:border-neutral-300 hover:scale-105"
        }`}
        onClick={() => onSelect(icon.name)}
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl text-white shadow-sm" style={{ backgroundColor: icon.color }}>
          <IconComponent name={icon.name} />
        </div>
      </button>
    ))}
  </div>
);

const Modal = ({ title, onClose, children, footer }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl border border-neutral-200" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-900 m-0">{title}</h3>
        <button className="p-2 text-neutral-500 hover:text-neutral-800 rounded-lg hover:bg-neutral-100" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="p-6 space-y-5">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-xl flex justify-end gap-3">{footer}</div>}
    </div>
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

  const handleSubmit = async () => {
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

  const handleCloseModal = () => setIsModalOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentPlatform((prev) => ({ ...prev, [name]: value }));
  };

  const handleIconSelect = (iconName) => {
    setCurrentPlatform((prev) => ({ ...prev, icon: iconName }));
  };

  const canEdit = user?.role === "admin" || userProjectRole === "PROJECT_MANAGER";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" text="Loading platforms..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platforms"
        subtitle="Define which platforms your project supports"
        icon="apps"
        badge={`${platforms.length} configured`}
        actions={
          canEdit && (
            <Button icon="add" onClick={() => handleOpenModal()}>
              Create platform
            </Button>
          )
        }
      />

      {platforms.length === 0 ? (
        <Card>
          <EmptyState
            icon="widgets"
            title="No platforms yet"
            description="Set up platforms to categorize tasks and releases."
            action={
              canEdit && (
                <Button icon="add" onClick={() => handleOpenModal()}>
                  Add platform
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {platforms.map((p) => {
            const iconInfo = PREDEFINED_PLATFORM_ICONS.find((i) => i.name === p.icon);
            return (
              <Card
                key={p._id}
                className="h-full"
                padding
                header={
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl shadow-sm"
                        style={{ backgroundColor: iconInfo?.color || "#7A869A" }}
                      >
                        <IconComponent name={p.icon} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-neutral-900 truncate">{p.name}</div>
                        <div className="text-xs text-neutral-500">Platform</div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" icon="edit" onClick={() => handleOpenModal(p)} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-accent-600 hover:bg-accent-50"
                          icon="delete"
                          onClick={() => {
                            setDeletePlatformId(p._id);
                            setIsDeleteModalOpen(true);
                          }}
                        />
                      </div>
                    )}
                  </div>
                }
              >
                <p className="text-sm text-neutral-600 leading-relaxed">{p.description || "No description provided."}</p>
              </Card>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <Modal
          title={currentPlatform?._id ? "Edit Platform" : "Create Platform"}
          onClose={handleCloseModal}
          footer={
            <>
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          }
        >
          <Input label="Name" name="name" value={currentPlatform.name} onChange={handleChange} placeholder="Mobile, Web, API..." required />
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-700">Icon</p>
            <IconPicker selectedIcon={currentPlatform.icon} onSelect={handleIconSelect} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Description</label>
            <textarea
              name="description"
              rows="3"
              value={currentPlatform.description || ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Optional context"
            />
          </div>
        </Modal>
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
