import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import priorityService from "../../services/priorityService";
import { getProjectByKey } from "../../services/projectService";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import { useAuth } from "../../contexts/AuthContext";

const PREDEFINED_PRIORITY_ICONS = [
  { name: "FaExclamationCircle", color: "#CD1317" }, // Critical
  { name: "FaArrowUp", color: "#F57C00" }, // High
  { name: "FaEquals", color: "#2A9D8F" }, // Medium
  { name: "FaArrowDown", color: "#2196F3" }, // Low
  { name: "FaFire", color: "#E94F37" },
  { name: "FaExclamationTriangle", color: "#FFB300" },
];

const IconComponent = ({ name }) => {
  const AllIcons = { ...FaIcons, ...VscIcons };
  const Icon = AllIcons[name];
  if (!Icon) return <FaIcons.FaQuestionCircle />;
  return <Icon />;
};

const IconPicker = ({ selectedIcon, onSelect }) => (
  <div className="flex flex-wrap gap-4">
    {PREDEFINED_PRIORITY_ICONS.map((icon) => (
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

const DraggablePriorityItem = ({ item, index, moveItem, openEditModal, openDeleteConfirm, canEdit }) => {
  const ref = React.useRef(null);
  const ItemType = "PRIORITY_ITEM";

  const [, drop] = useDrop({
    accept: ItemType,
    hover(draggedItem, monitor) {
      if (!canEdit) return;

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
    canDrag: () => canEdit,
  });

  const handleRef = React.useRef(null);
  if (canEdit) {
    drag(handleRef);
  }
  drop(ref);

  const iconInfo = PREDEFINED_PRIORITY_ICONS.find((i) => i.name === item.icon);

  const handleEditClick = (e) => {
    e.stopPropagation();
    openEditModal(item);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    openDeleteConfirm(item._id);
  };

  return (
    <div
      ref={ref}
      className={`flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 mb-3 hover:shadow-md transition-all ${isDragging ? "opacity-50" : ""}`}
    >
      {canEdit && (
        <div className="cursor-move text-gray-400 hover:text-gray-600" ref={handleRef}>
          <span className="material-symbols-outlined">drag_indicator</span>
        </div>
      )}
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl flex-shrink-0"
        style={{ backgroundColor: iconInfo?.color || "#7A869A" }}
      >
        <IconComponent name={item.icon} />
      </div>
      <div className="flex-1">
        <div className="text-base font-semibold text-gray-900">{item.name}</div>
        <div className="text-sm text-gray-600">Level {item.level}</div>
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <button
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            onClick={handleEditClick}
            title="Edit"
          >
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            onClick={handleDeleteClick}
            title="Delete"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      )}
    </div>
  );
};

const ProjectSettingPriority = () => {
  const params = useParams();
  const projectKey = params.projectKey ? params.projectKey.toUpperCase() : null;
  const { user } = useAuth();
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPriority, setCurrentPriority] = useState(null);
  const [userProjectRole, setUserProjectRole] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePriorityId, setDeletePriorityId] = useState(null);

  const isFetching = useRef(false);

  const fetchPriorities = useCallback(async () => {
    if (!projectKey || isFetching.current) {
      return;
    }
    try {
      isFetching.current = true; // Bắt đầu fetch
      setLoading(true);
      const response = await priorityService.getAllPriorities(projectKey);
      setPriorities(response.data);
    } catch (error) {
      toast.error("Failed to fetch priorities.");
    } finally {
      setLoading(false);
      isFetching.current = false; // Kết thúc fetch
    }
  }, [projectKey]); // Dependency chỉ còn là projectKey

  useEffect(() => {
    fetchPriorities();
  }, [fetchPriorities]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!projectKey || !user) return;
      try {
        const response = await getProjectByKey(projectKey);
        const project = response.data;
        const member = project.members?.find((m) => m.userId._id === user._id);
        setUserProjectRole(member?.role || null);
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };
    fetchUserRole();
  }, [projectKey, user]);

  const handleOpenModal = (priority = null) => {
    setCurrentPriority(priority ? { ...priority } : { name: "", icon: "FaFire" });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = { name: currentPriority.name, icon: currentPriority.icon, projectKey: projectKey };
    try {
      if (currentPriority._id) {
        await priorityService.updatePriority(currentPriority._id, payload);
        toast.success("Priority updated!");
      } else {
        await priorityService.createPriority(payload);
        toast.success("Priority created for this project!");
      }
      handleCloseModal();
      fetchPriorities(); // Gọi làm mới
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirm = (id) => {
    setDeletePriorityId(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      await priorityService.deletePriority(deletePriorityId);
      toast.success("Priority deleted!");
      fetchPriorities();
      setIsDeleteModalOpen(false);
      setDeletePriorityId(null);
    } catch (error) {
      toast.error("Failed to delete priority.");
    }
  };

  const movePriority = useCallback(
    async (dragIndex, hoverIndex) => {
      const newPriorities = [...priorities];
      const [draggedItem] = newPriorities.splice(dragIndex, 1);
      newPriorities.splice(hoverIndex, 0, draggedItem);

      const updatedItemsWithLevel = newPriorities.map((item, index) => ({ ...item, level: index + 1 }));
      setPriorities(updatedItemsWithLevel);

      try {
        await priorityService.updatePriorityLevels(projectKey, updatedItemsWithLevel);
      } catch (error) {
        toast.error("Failed to save new order. Reverting.");
        fetchPriorities(); // Tải lại nếu có lỗi
      }
    },
    [priorities, projectKey, fetchPriorities],
  );

  const handleCloseModal = () => setIsModalOpen(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentPriority((prev) => ({ ...prev, [name]: value }));
  };
  const handleIconSelect = (iconName) => {
    setCurrentPriority((prev) => ({ ...prev, icon: iconName }));
  };

  // Check if user has permission (admin or PM)
  const canEdit = user?.role === "admin" || userProjectRole === "PROJECT_MANAGER";

  if (loading && priorities.length === 0) return <div className="flex items-center justify-center py-8 text-gray-500">Loading priorities...</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bg-white">
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold text-blue-900 m-0">Priorities</h2>
            <p className="text-gray-600 text-base mt-2">{priorities.length} priorities configured • Drag to reorder</p>
          </div>
          {canEdit && (
            <button
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white border-none rounded-lg font-semibold shadow-lg shadow-purple-300/30 hover:shadow-lg hover:shadow-purple-400/40 hover:-translate-y-0.5 transition-all"
              onClick={() => handleOpenModal()}
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Create Priority
            </button>
          )}
        </div>

        <div className="space-y-0">
          {priorities.map((item, index) => (
            <DraggablePriorityItem
              key={item._id}
              item={item}
              index={index}
              moveItem={movePriority}
              openEditModal={handleOpenModal}
              openDeleteConfirm={openDeleteConfirm}
              canEdit={canEdit}
            />
          ))}
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseModal}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{currentPriority?._id ? "Edit Priority" : "Create Priority"}</h2>
              <button className="text-gray-500 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors" onClick={handleCloseModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                    Priority Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    value={currentPriority.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Icon</label>
                  <IconPicker selectedIcon={currentPriority.icon} onSelect={handleIconSelect} />
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
      ) : null}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletePriorityId(null);
        }}
        onConfirm={handleDelete}
        title="Delete Priority"
        message="Are you sure you want to delete this priority? This might affect projects using it."
      />
    </DndProvider>
  );
};

export default ProjectSettingPriority;
