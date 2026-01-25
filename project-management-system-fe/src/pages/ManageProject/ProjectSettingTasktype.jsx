import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import typeTaskService from "../../services/typeTaskService";
import { getProjectByKey } from "../../services/projectService";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
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

const IconPicker = ({ selectedIcon, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-4">
      {PREDEFINED_ICONS.map((icon) => (
        <button
          key={icon.name}
          type="button"
          className={`p-3 rounded-lg border-2 transition-all ${selectedIcon === icon.name ? "border-purple-600 bg-purple-50" : "border-gray-200 hover:border-gray-300"}`}
          onClick={() => onSelect(icon.name)}
        >
          <div className="w-12 h-12 flex items-center justify-center text-xl text-white" style={{ backgroundColor: icon.color }}>
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

  if (loading) return <div className="flex items-center justify-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="bg-white">
      <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
        <div className="flex flex-col">
          <h2 className="text-3xl font-bold text-blue-900 m-0">Task Types</h2>
          <p className="text-gray-600 text-base mt-2">{taskTypes.length} task types configured</p>
        </div>
        {canEdit && (
          <button
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white border-none rounded-lg font-semibold shadow-lg shadow-purple-300/30 hover:shadow-lg hover:shadow-purple-400/40 hover:-translate-y-0.5 transition-all"
            onClick={() => handleOpenModal()}
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Create Task Type
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {taskTypes.map((tt) => {
          const iconInfo = PREDEFINED_ICONS.find((i) => i.name === tt.icon);
          const iconColor = iconInfo ? iconInfo.color : "#4BADE8";
          return (
            <div
              className="bg-white rounded-xl p-6 flex flex-start gap-4 shadow-sm border border-gray-100 hover:-translate-y-1 hover:shadow-md transition-all"
              key={tt._id}
            >
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl text-white"
                style={{ backgroundColor: iconColor }}
              >
                <IconComponent name={tt.icon} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mt-0 mb-1">{tt.name}</h3>
                <p className="text-gray-600 text-sm mb-3">{tt.description || "No description"}</p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    onClick={() => handleOpenModal(tt)}
                    title="Edit"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={() => {
                      setDeleteTaskTypeId(tt._id);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseModal}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{currentTaskType._id ? "Edit Task Type" : "Create Task Type"}</h2>
              <button className="text-gray-500 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors" onClick={handleCloseModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                    Task Type <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    value={currentTaskType.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Icon</label>
                  <IconPicker selectedIcon={currentTaskType.icon} onSelect={handleIconSelect} />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    value={currentTaskType.description || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  ></textarea>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white font-medium transition-colors"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  disabled={isSaving}
                >
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
