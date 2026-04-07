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
import typeTaskService from "../../services/typeTaskService";
import { getProjectByKey } from "../../services/projectService";
import ConfirmationModal from "../../components/common/ConfirmationModal";
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

const IconPicker = ({ selectedIcon, onSelect }) => (
  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
    {PREDEFINED_ICONS.map((icon) => (
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

  const handleSubmit = async () => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" text="Loading task types..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Types"
        subtitle="Define work item categories for this project"
        icon="category"
        badge={`${taskTypes.length} configured`}
        actions={
          canEdit && (
            <Button icon="add" onClick={() => handleOpenModal()}>
              Create task type
            </Button>
          )
        }
      />

      {taskTypes.length === 0 ? (
        <Card>
          <EmptyState
            icon="category"
            title="No task types yet"
            description="Add task types to categorize your issues and stories."
            action={
              canEdit && (
                <Button icon="add" onClick={() => handleOpenModal()}>
                  Add task type
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {taskTypes.map((tt) => {
            const iconInfo = PREDEFINED_ICONS.find((i) => i.name === tt.icon);
            const iconColor = iconInfo ? iconInfo.color : "#4BADE8";
            return (
              <Card
                key={tt._id}
                className="h-full"
                header={
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl text-white shadow-sm"
                        style={{ backgroundColor: iconColor }}
                      >
                        <IconComponent name={tt.icon} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-neutral-900 truncate">{tt.name}</div>
                        <div className="text-xs text-neutral-500">Task type</div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" icon="edit" onClick={() => handleOpenModal(tt)} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-accent-600 hover:bg-accent-50"
                          icon="delete"
                          onClick={() => {
                            setDeleteTaskTypeId(tt._id);
                            setIsDeleteModalOpen(true);
                          }}
                        />
                      </div>
                    )}
                  </div>
                }
              >
                <p className="text-sm text-neutral-600 leading-relaxed">{tt.description || "No description provided."}</p>
              </Card>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <Modal
          title={currentTaskType._id ? "Edit Task Type" : "Create Task Type"}
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
          <Input
            label="Task type"
            name="name"
            value={currentTaskType.name}
            onChange={handleChange}
            placeholder="Story, Bug, Improvement..."
            required
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-700">Icon</p>
            <IconPicker selectedIcon={currentTaskType.icon} onSelect={handleIconSelect} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">Description</label>
            <textarea
              id="description"
              name="description"
              rows="3"
              value={currentTaskType.description || ""}
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
