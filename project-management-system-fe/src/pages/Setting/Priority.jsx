import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import priorityService from "../../services/priorityService";
import * as FaIcons from "react-icons/fa";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import IconPicker from "../../components/Setting/IconPicker";
import "../../styles/Setting/SettingsPage.css";
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
    <div ref={ref} className={`settings-list-item ${isDragging ? "dragging" : ""}`}>
      <div className="drag-handle">
        <span className="material-symbols-outlined">drag_indicator</span>
      </div>
      <div className="item-icon" style={{ backgroundColor: iconInfo?.color || "#7A869A" }}>
        <IconComponent name={item.icon} />
      </div>
      <div className="item-content">
        <div className="item-name">{item.name}</div>
        <div className="item-meta">
          Level {item.level}
          {item.projectId ? " • Project-specific" : " • Default"}
        </div>
      </div>
      {!item.projectId && (
        <div className="item-actions">
          <button
            className="btn-icon-action"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(item);
            }}
          >
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button
            className="btn-icon-action delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item._id);
            }}
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT CHÍNH ---
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
      <div className="settings-loading">
        <div className="spinner"></div>
        <p>Loading priorities...</p>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="settings-page-container">
        <div className="settings-page-header">
          <div className="header-left">
            <h2>Priorities</h2>
            <p>{priorities.length} priorities configured • Drag to reorder</p>
          </div>
          {user.role === "admin" && (
            <button className="btn-create" onClick={() => handleOpenModal()}>
              <span className="material-symbols-outlined">add</span>
              Create Priority
            </button>
          )}
        </div>

        <div className="settings-list">
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
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{currentPriority._id ? "Edit Priority" : "Create Priority"}</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="name">
                    Priority Name <span className="required">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={currentPriority.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Critical, High, Medium, Low"
                  />
                </div>
                <div className="form-group">
                  <label>Icon</label>
                  <IconPicker
                    icons={PREDEFINED_PRIORITY_ICONS.map((icon) => ({
                      ...icon,
                      component: <IconComponent name={icon.name} />,
                    }))}
                    selectedIcon={currentPriority.icon}
                    onSelect={handleIconSelect}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
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
