import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import platformService from "../../services/platformService";
import { getProjectByKey } from "../../services/projectService";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
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
  <div className="flex flex-wrap gap-4">
    {PREDEFINED_PLATFORM_ICONS.map((icon) => (
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

  if (loading) return <div className="flex items-center justify-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="bg-white">
      <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
        <div className="flex flex-col">
          <h2 className="text-3xl font-bold text-blue-900 m-0">Platforms</h2>
          <p className="text-gray-600 text-base mt-2">{platforms.length} platforms configured</p>
        </div>
        {canEdit && (
          <button
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white border-none rounded-lg font-semibold shadow-lg shadow-purple-300/30 hover:shadow-lg hover:shadow-purple-400/40 hover:-translate-y-0.5 transition-all"
            onClick={() => handleOpenModal()}
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Create Platform
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((p) => {
          const iconInfo = PREDEFINED_PLATFORM_ICONS.find((i) => i.name === p.icon);
          return (
            <div
              className="bg-white rounded-xl p-6 flex flex-start gap-4 shadow-sm border border-gray-100 hover:-translate-y-1 hover:shadow-md transition-all"
              key={p._id}
            >
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl text-white"
                style={{ backgroundColor: iconInfo?.color || "#7A869A" }}
              >
                <IconComponent name={p.icon} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mt-0 mb-1">{p.name}</h3>
                <p className="text-gray-600 text-sm mb-3">{p.description || "No description"}</p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Edit"
                    onClick={() => handleOpenModal(p)}
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                    onClick={() => {
                      setDeletePlatformId(p._id);
                      setIsDeleteModalOpen(true);
                    }}
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
              <h2 className="text-xl font-bold text-gray-900">{currentPlatform?._id ? "Edit Platform" : "Create Platform"}</h2>
              <button className="text-gray-500 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors" onClick={handleCloseModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    value={currentPlatform.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Icon</label>
                  <IconPicker selectedIcon={currentPlatform.icon} onSelect={handleIconSelect} />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    value={currentPlatform.description || ""}
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
