import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import priorityService from "../../services/priorityService";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
import { useDrag, useDrop } from "react-dnd";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import "../../styles/pages/ManageProject/ProjectSettings_TaskType.css";
import { useAuth } from "../../contexts/AuthContext";
// DANH SÁCH ICON CHO PRIORITY
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
  const AllIcons = { ...FaIcons, ...VscIcons };
  const Icon = AllIcons[name];
  if (!Icon) return <FaIcons.FaQuestionCircle />;
  return <Icon />;
};

const IconPicker = ({ selectedIcon, onSelect }) => (
  <div className="icon-picker-container">
    {PREDEFINED_PRIORITY_ICONS.map((icon) => (
      <button
        key={icon.name}
        type="button"
        className={`icon-picker-button ${selectedIcon === icon.name ? "selected" : ""}`}
        onClick={() => onSelect(icon.name)}
      >
        <div className="icon-display" style={{ backgroundColor: icon.color }}>
          <IconComponent name={icon.name} />
        </div>
      </button>
    ))}
  </div>
);

// (Bạn có thể tách ra file DraggablePriorityItem.jsx riêng nếu muốn)
const DraggablePriorityItem = ({ item, index, moveItem, openEditModal, onDelete }) => {
  const ref = React.useRef(null);
  const ItemType = "PRIORITY_ITEM";

  const [, drop] = useDrop({
    accept: ItemType,
    hover(draggedItem) {
      if (draggedItem.index !== index) {
        moveItem(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { id: item._id, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  drag(drop(ref));
  const iconInfo = PREDEFINED_PRIORITY_ICONS.find((i) => i.name === item.icon);

  const handleEditClick = (e) => {
    e.stopPropagation();
    openEditModal(item);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(item._id);
  };

  return (
    <div ref={ref} className="settings-list-row" style={{ opacity: isDragging ? 0.5 : 1 }}>
      <div className="row-col col-drag-handle">
        <FaIcons.FaGripVertical />
      </div>
      <div className="row-col col-icon">
        <span className="icon-wrapper" style={{ backgroundColor: iconInfo?.color || "#7A869A" }}>
          <IconComponent name={item.icon} />
        </span>
      </div>
      <div className="row-col col-name">{item.name}</div>
      <div className="row-col col-level">{item.level}</div>
      <div className="row-col col-project">{item.projectId ? item.projectId.name : <span className="default-badge">Default</span>}</div>
      {!item.projectId && (
        <div className="row-col col-actions">
          <button className="btn-edit" onClick={handleEditClick}>
            <FaIcons.FaPencilAlt />
          </button>
          <button className="btn-delete" onClick={handleDeleteClick}>
            <FaIcons.FaTrash />
          </button>
        </div>
      )}
      {item.projectId && (
        <div className="row-col col-actions">
          <span className="menu-item-disabled">Managed in Project</span>
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
    [priorities, fetchPriorities]
  );

  if (loading) return <div>Loading...</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="settings-list-container">
        <div className="settings-list-header">
          <div className="header-col col-drag-handle"></div>
          <div className="header-col col-icon">Icon</div>
          <div className="header-col col-name">Priority Name</div>
          {user.role === "admin" && (
            <div className="header-col col-actions">
              <button className="btn-add-icon" onClick={() => handleOpenModal()}>
                <VscIcons.VscAdd />
              </button>
            </div>
          )}
        </div>
        <div className="settings-list-body">
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
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{currentPriority._id ? "Edit Priority" : "Create Priority"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name" className="required">
                  Priority Name
                </label>
                <input id="name" name="name" value={currentPriority.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Icon</label>
                <IconPicker selectedIcon={currentPriority.icon} onSelect={handleIconSelect} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
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
