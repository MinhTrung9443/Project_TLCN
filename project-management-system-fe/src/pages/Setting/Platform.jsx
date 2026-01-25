import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import platformService from "../../services/platformService";
import * as FaIcons from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        <p className="mt-4 text-gray-600">Loading platforms...</p>
      </div>
    );
  }

  return (
    <div className="font-sans text-gray-900">
      <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-gray-200">
        <div>
          <h2 className="text-3xl font-bold text-blue-900 mb-2">Platforms</h2>
          <p className="text-sm text-gray-600">{platforms.length} platforms configured</p>
        </div>
        {user.role === "admin" && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 shadow-md"
          >
            <span>add</span>
            Create Platform
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((p) => {
          const iconInfo = PREDEFINED_PLATFORM_ICONS.find((i) => i.name === p.icon);
          return (
            <div
              key={p._id}
              className="bg-white rounded-lg p-6 flex items-start gap-4 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-2 border-transparent hover:border-purple-200"
            >
              <div
                className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-md hover:scale-110 transition-transform text-2xl"
                style={{ backgroundColor: iconInfo?.color || "#4BADE8" }}
              >
                <IconComponent name={p.icon} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-blue-900 mb-1">{p.name}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{p.description || "No description"}</p>
                {p.projectId && (
                  <span className="inline-block px-3 py-1 text-xs font-semibold text-purple-600 bg-purple-100 rounded">Project-specific</span>
                )}
                {!p.projectId && <span className="inline-block px-3 py-1 text-xs font-semibold text-green-600 bg-green-100 rounded">Default</span>}
              </div>
              {!p.projectId && user.role === "admin" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(p)}
                    title="Edit"
                    className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-600 hover:text-white hover:scale-110 transition-all flex items-center justify-center"
                  >
                    <span>edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(p)}
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
              <h2 className="text-xl font-bold text-gray-900">{currentPlatform?._id ? "Edit Platform" : "Create Platform"}</h2>
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
                    value={currentPlatform?.name || ""}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Web, Mobile, Desktop"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Icon</label>
                  <IconPicker
                    icons={PREDEFINED_PLATFORM_ICONS.map((icon) => ({
                      ...icon,
                      component: <IconComponent name={icon.name} />,
                    }))}
                    selectedIcon={currentPlatform?.icon || "FaCode"}
                    onSelect={handleIconSelect}
                  />
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
