import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import EmptyState from "../../components/ui/EmptyState";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import priorityService from "../../services/priorityService";
import { getProjectByKey } from "../../services/projectService";
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
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
    {PREDEFINED_PRIORITY_ICONS.map((icon) => (
      <button
        key={icon.name}
        type="button"
        className={`group flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
          selectedIcon === icon.name ? "border-primary-500 bg-primary-50 shadow-sm" : "border-neutral-200 hover:border-neutral-300"
        }`}
        onClick={() => onSelect(icon.name)}
      >
        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl text-white shadow-sm" style={{ backgroundColor: icon.color }}>
          <IconComponent name={icon.name} />
        </div>
        <span className="text-sm font-semibold text-neutral-800">{icon.name.replace("Fa", "")}</span>
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
      className={`flex items-center gap-4 p-4 bg-white rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-all ${isDragging ? "opacity-50" : ""}`}
    >
      {canEdit && (
        <div className="cursor-move text-neutral-400 hover:text-neutral-600" ref={handleRef}>
          <span className="material-symbols-outlined">drag_indicator</span>
        </div>
      )}
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl flex-shrink-0 shadow-sm"
        style={{ backgroundColor: iconInfo?.color || "#7A869A" }}
      >
        <IconComponent name={item.icon} />
      </div>
      <div className="flex-1">
        <div className="text-base font-semibold text-neutral-900">{item.name}</div>
        <div className="text-sm text-neutral-600">Level {item.level}</div>
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon="edit" onClick={handleEditClick} />
          <Button size="sm" variant="ghost" className="text-accent-600 hover:bg-accent-50" icon="delete" onClick={handleDeleteClick} />
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

  const handleSubmit = async () => {
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

  if (loading && priorities.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" text="Loading priorities..." />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <PageHeader
          title="Priorities"
          subtitle="Define and reorder priority levels for this project"
          icon="flag"
          badge={`${priorities.length} configured`}
          actions={
            canEdit && (
              <Button icon="add" onClick={() => handleOpenModal()}>
                Create priority
              </Button>
            )
          }
        />

        <Card>
          {priorities.length === 0 ? (
            <EmptyState
              icon="flag"
              title="No priorities yet"
              description="Set up priorities so tasks can be ranked."
              action={
                canEdit && (
                  <Button icon="add" onClick={() => handleOpenModal()}>
                    Add priority
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-3">
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
          )}
        </Card>

        {isModalOpen && (
          <Modal
            title={currentPriority?._id ? "Edit Priority" : "Create Priority"}
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
              label="Priority name"
              name="name"
              value={currentPriority.name}
              onChange={handleChange}
              placeholder="Critical, High, Medium..."
              required
            />
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Icon</p>
              <IconPicker selectedIcon={currentPriority.icon} onSelect={handleIconSelect} />
            </div>
          </Modal>
        )}

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
      </div>
    </DndProvider>
  );
};

export default ProjectSettingPriority;
