import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import priorityService from "../../services/priorityService";
import * as FaIcons from "react-icons/fa";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import IconPicker from "../../components/Setting/IconPicker";
import { useAuth } from "../../contexts/AuthContext";

const PREDEFINED_PRIORITY_ICONS = [
  { name: "FaFire", color: "#CD1317" },
  { name: "FaExclamationCircle", color: "#E94F37" },
  { name: "FaArrowUp", color: "#F4A261" },
  { name: "FaArrowAltCircleUp", color: "#F57C00" },
  { name: "FaEquals", color: "#2A9D8F" },
  { name: "FaPlusCircle", color: "#45B8AC" },
  { name: "FaMinusCircle", color: "#264653" },
  { name: "FaArrowDown", color: "#2196F3" },
  { name: "FaArrowAltCircleDown", color: "#03A9F4" },
  { name: "FaExclamationTriangle", color: "#FFB300" },
];

const IconComponent = ({ name }) => {
  const AllIcons = FaIcons;
  const Icon = AllIcons[name];
  if (!Icon) return <FaIcons.FaQuestionCircle />;
  return <Icon />;
};

const DraggablePriorityItem = ({ item, index, moveItem, openEditModal, onDelete }) => {
  const ref = React.useRef(null);
  const ItemType = "PRIORITY_ITEM";

  const [, drop] = useDrop({
    accept: ItemType,
    hover(draggedItem, monitor) {
      const dragIndex = draggedItem.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveItem(dragIndex, hoverIndex);
      draggedItem.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { id: item._id, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  drag(drop(ref));
  const iconInfo = PREDEFINED_PRIORITY_ICONS.find((i) => i.name === item.icon);

  return (
    <div
      ref={ref}
      className={`flex items-center gap-4 px-5 py-4 border-b border-gray-200 hover:bg-gray-50 ${isDragging ? "opacity-50 rotate-1" : "bg-white"}`}
    >
      <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 cursor-grab active:cursor-grabbing flex items-center justify-center hover:bg-purple-200 transition-colors flex-shrink-0">
        <span>drag_indicator</span>
      </div>
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-sm text-lg"
        style={{ backgroundColor: iconInfo?.color || "#7A869A" }}
      >
        <IconComponent name={item.icon} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold text-blue-900">{item.name}</div>
        <div className="text-sm text-gray-600 mt-1">
          Level {item.level}
          {item.projectId ? " • Project-specific" : " • Default"}
        </div>
      </div>
      {!item.projectId && (
        <div className="flex gap-2">
          <button
            className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-600 hover:text-white hover:scale-110 transition-all flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(item);
            }}
          >
            <span>edit</span>
          </button>
          <button
            className="w-9 h-9 rounded-lg bg-red-100 text-red-600 hover:bg-red-600 hover:text-white hover:scale-110 transition-all flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item._id);
            }}
          >
            <span>delete</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const SettingsPriorities = () => {
  const { user } = useAuth();
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPriority, setCurrentPriority] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [priorityToDelete, setPriorityToDelete] = useState(null);

  const fetchPriorities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await priorityService.getAllPriorities();
      setPriorities(response.data);
    } catch (error) {
      toast.error("Failed to fetch priorities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPriorities();
  }, [fetchPriorities]);

  const handleOpenModal = (priority = null) => {
    setCurrentPriority(priority ? { ...priority } : { name: "", icon: "FaFire" });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleDeleteClick = (priorityId) => {
    const priority = priorities.find((p) => p._id === priorityId);
    setPriorityToDelete(priority);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await priorityService.deletePriority(priorityToDelete._id);
      toast.success("Priority deleted successfully!");
      setIsDeleteModalOpen(false);
      setPriorityToDelete(null);
      fetchPriorities();
    } catch (error) {
      toast.error("Failed to delete priority.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentPriority((prev) => ({ ...prev, [name]: value }));
  };

  const handleIconSelect = (iconName) => {
    setCurrentPriority((prev) => ({ ...prev, icon: iconName }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = {
      name: currentPriority.name,
      icon: currentPriority.icon,
    };
    try {
      if (currentPriority._id) {
        await priorityService.updatePriority(currentPriority._id, payload);
        toast.success("Priority updated!");
      } else {
        await priorityService.createPriority(payload);
        toast.success("Priority created!");
      }
      handleCloseModal();
      fetchPriorities();
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const movePriority = useCallback(
    async (dragIndex, hoverIndex) => {
      const newPriorities = [...priorities];
      const [draggedItem] = newPriorities.splice(dragIndex, 1);
      newPriorities.splice(hoverIndex, 0, draggedItem);

      const updatedItemsWithLevel = newPriorities.map((item, index) => ({
        ...item,
        level: index + 1,
      }));

      setPriorities(updatedItemsWithLevel);

      try {
        await priorityService.updatePriorityLevels(null, updatedItemsWithLevel);
      } catch (error) {
        toast.error("Failed to save new order. Reverting.");
        fetchPriorities();
      }
    },
    [priorities, fetchPriorities],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        <p className="mt-4 text-gray-600">Loading priorities...</p>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="font-sans text-gray-900">
        <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h2 className="text-3xl font-bold text-blue-900 mb-2">Priorities</h2>
            <p className="text-sm text-gray-600">{priorities.length} priorities configured • Drag to reorder</p>
          </div>
          {user.role === "admin" && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 shadow-md"
            >
              <span>add</span>
              Create Priority
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {priorities.map((item, index) => (
            <DraggablePriorityItem
              key={item._id}
              item={item}
              index={index}
              moveItem={movePriority}
              openEditModal={handleOpenModal}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={handleCloseModal}>
          <div className="bg-white rounded-lg w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{currentPriority?._id ? "Edit Priority" : "Create Priority"}</h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700 transition-colors">
                <span>close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                    Priority Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={currentPriority?.name || ""}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Critical, High, Medium, Low"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Icon</label>
                  <IconPicker
                    icons={PREDEFINED_PRIORITY_ICONS.map((icon) => ({
                      ...icon,
                      component: <IconComponent name={icon.name} />,
                    }))}
                    selectedIcon={currentPriority?.icon || "FaFire"}
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
          setPriorityToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Priority"
        message={`Are you sure you want to delete "${priorityToDelete?.name}"? This might affect projects using it.`}
      />
    </DndProvider>
  );
};
export default SettingsPriorities;
