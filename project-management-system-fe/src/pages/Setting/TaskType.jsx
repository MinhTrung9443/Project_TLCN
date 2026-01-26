import React, { useState, useEffect, useCallback } from "react";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import typeTaskService from "../../services/typeTaskService";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import IconPicker from "../../components/Setting/IconPicker";
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
      <div className="py-24">
        <LoadingSpinner size="lg" text="Loading task types..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <PageHeader
        title="Task Types"
        subtitle="Define the categories of work your team tracks"
        icon="category"
        badge={`${taskTypes.length} configured`}
        actions={
          user.role === "admin" ? (
            <Button icon="add" onClick={() => handleOpenModal()}>
              Create task type
            </Button>
          ) : null
        }
      />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Card header={<div className="text-sm text-neutral-600">Use task types to distinguish bugs, features, chores, and more.</div>}>
          {taskTypes.length === 0 ? (
            <EmptyState
              icon="category"
              title="No task types yet"
              description="Create task types to help teams classify work and reporting."
              action={
                user.role === "admin" ? (
                  <Button icon="add" onClick={() => handleOpenModal()}>
                    Create task type
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {taskTypes.map((tt) => {
                const iconInfo = PREDEFINED_ICONS.find((i) => i.name === tt.icon);
                const iconColor = iconInfo ? iconInfo.color : "#4BADE8";
                return (
                  <Card
                    key={tt._id}
                    hoverable
                    className="h-full"
                    header={
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl shadow"
                            style={{ backgroundColor: iconColor }}
                          >
                            <IconComponent name={tt.icon} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-neutral-900">{tt.name}</h3>
                            <p className="text-sm text-neutral-500">{tt.level ? `Level ${tt.level}` : "Standard"}</p>
                          </div>
                        </div>
                        {tt.projectId && (
                          <Badge variant="primary" size="sm" icon="hub">
                            Project
                          </Badge>
                        )}
                      </div>
                    }
                    footer={
                      user.role === "admin" && !tt.projectId ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="secondary" size="sm" icon="edit" onClick={() => handleOpenModal(tt)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-accent-600 hover:bg-accent-50"
                            icon="delete"
                            onClick={() => handleDeleteClick(tt)}
                          >
                            Delete
                          </Button>
                        </div>
                      ) : null
                    }
                  >
                    <p className="text-sm text-neutral-600 line-clamp-3">{tt.description || "No description"}</p>
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
                <p className="text-xs uppercase text-neutral-500">Task type</p>
                <h2 className="text-lg font-semibold text-neutral-900">{currentTaskType?._id ? "Edit task type" : "Create task type"}</h2>
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
                  value={currentTaskType?.name || ""}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Bug, Feature, Story"
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-800">Icon</p>
                <IconPicker
                  icons={PREDEFINED_ICONS.map((icon) => ({
                    ...icon,
                    component: <IconComponent name={icon.name} />,
                  }))}
                  selectedIcon={currentTaskType?.icon || "FaTasks"}
                  onSelect={handleIconSelect}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium text-neutral-800">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows="3"
                  value={currentTaskType?.description || ""}
                  onChange={handleChange}
                  placeholder="Optional description"
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                ></textarea>
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
