import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import typeTaskService from "../../services/typeTaskService";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
import IconPicker from "../../components/Setting/IconPicker";
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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        <p className="mt-4 text-gray-600">Loading task types...</p>
      </div>
    );
  }

  return (
    <div className="font-sans text-gray-900">
      <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-gray-200">
        <div>
          <h2 className="text-3xl font-bold text-blue-900 mb-2">Task Types</h2>
          <p className="text-sm text-gray-600">{taskTypes.length} task types configured</p>
        </div>
        {user.role === "admin" && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 shadow-md"
          >
            <span>add</span>
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
              key={tt._id}
              className="bg-white rounded-lg p-6 flex items-start gap-4 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-2 border-transparent hover:border-purple-200"
            >
              <div
                className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-md hover:scale-110 transition-transform"
                style={{ backgroundColor: iconColor }}
              >
                <div className="text-2xl">
                  <IconComponent name={tt.icon} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-blue-900 mb-1">{tt.name}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{tt.description || "No description"}</p>
                {tt.projectId && (
                  <span className="inline-block px-3 py-1 text-xs font-semibold text-purple-600 bg-purple-100 rounded">Project-specific</span>
                )}
                {!tt.projectId && <span className="inline-block px-3 py-1 text-xs font-semibold text-green-600 bg-green-100 rounded">Default</span>}
              </div>
              {user.role === "admin" && !tt.projectId && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(tt)}
                    title="Edit"
                    className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-600 hover:text-white hover:scale-110 transition-all flex items-center justify-center"
                  >
                    <span>edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(tt)}
                    title="Delete"
                    className="w-9 h-9 rounded-lg bg-red-100 text-red-600 hover:bg-red-600 hover:text-white hover:scale-110 transition-all flex items-center justify-center"
                  >
                    <span>delete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={handleCloseModal}>
          <div className="bg-white rounded-lg w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{currentTaskType?._id ? "Edit Task Type" : "Create Task Type"}</h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700 transition-colors">
                <span>close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={currentTaskType?.name || ""}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Bug, Feature, Story"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Icon</label>
                  <IconPicker
                    icons={PREDEFINED_ICONS.map((icon) => ({
                      ...icon,
                      component: <IconComponent name={icon.name} />,
                    }))}
                    selectedIcon={currentTaskType?.icon || "FaTasks"}
                    onSelect={handleIconSelect}
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    value={currentTaskType?.description || ""}
                    onChange={handleChange}
                    placeholder="Optional description"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                  ></textarea>
                </div>
              </div>
              <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 transition-colors"
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
