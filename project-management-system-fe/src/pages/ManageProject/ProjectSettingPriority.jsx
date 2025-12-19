import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import priorityService from "../../services/priorityService";
import { getProjectByKey } from "../../services/projectService";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
import { FaGripVertical } from "react-icons/fa";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import "../../styles/pages/ManageProject/ProjectSettings_TaskType.css";
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

const DraggablePriorityItem = ({ item, index, moveItem, openEditModal, openDeleteConfirm, canEdit }) => {
  const ref = React.useRef(null);
  const ItemType = "PRIORITY_ITEM";
  const handleRef = React.useRef(null);
  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { id: item._id, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    canDrag: () => canEdit,
  });
  const [, drop] = useDrop({
    accept: ItemType,
    hover(draggedItem) {
      if (canEdit && draggedItem.index !== index) {
        moveItem(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });
  if (canEdit) {
    drag(handleRef);
  }
  drop(ref);

  const iconInfo = PREDEFINED_PRIORITY_ICONS.find((i) => i.name === item.icon);

  const handleEditClick = (e) => {
    e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
    openEditModal(item);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
    openDeleteConfirm(item._id);
  };

  return (
    <div ref={ref} className="settings-list-row" style={{ opacity: isDragging ? 0.5 : 1 }}>
      {canEdit && (
        <div className="row-col col-drag-handle" ref={handleRef}>
          <FaGripVertical />
        </div>
      )}
      <div className="row-col col-icon">
        <span className="icon-wrapper" style={{ backgroundColor: iconInfo?.color || "#7A869A" }}>
          <IconComponent name={item.icon} />
        </span>
      </div>
      <div className="row-col col-name">{item.name}</div>
      {canEdit && (
        <div className="row-col col-actions">
          <button className="btn-edit" onClick={handleEditClick}>
            <FaIcons.FaPencilAlt />
          </button>
          <button className="btn-delete" onClick={handleDeleteClick}>
            <FaIcons.FaTrash />
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
    [priorities, projectKey, fetchPriorities]
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

  if (loading && priorities.length === 0) return <div>Loading priorities...</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`settings-list-container ${!canEdit ? "readonly" : ""}`}>
        <div className="settings-list-header">
          {canEdit && <div className="header-col col-drag-handle"></div>}
          <div className="header-col col-icon">Icon</div>
          <div className="header-col col-name">Priority Name</div>
          {canEdit && (
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
              openDeleteConfirm={openDeleteConfirm}
              canEdit={canEdit}
            />
          ))}
        </div>
      </div>
      {isModalOpen ? (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{currentPriority?._id ? "Edit Priority" : "Create Priority"}</h2>
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
