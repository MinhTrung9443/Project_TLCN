import React, { useState, useEffect, useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import * as FaIcons from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import priorityService from "../../services/priorityService";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import IconPicker from "../../components/Setting/IconPicker";

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
      className={`flex items-center gap-4 px-5 py-4 border-b border-neutral-200 hover:bg-neutral-50 ${isDragging ? "opacity-50" : "bg-white"}`}
    >
      <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-700 cursor-grab active:cursor-grabbing flex items-center justify-center hover:bg-primary-100 transition-colors flex-shrink-0">
        <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
      </div>
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-sm text-lg"
        style={{ backgroundColor: iconInfo?.color || "#7A869A" }}
      >
        <IconComponent name={item.icon} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold text-neutral-900">{item.name}</div>
        <div className="text-sm text-neutral-600 mt-1">
          Level {item.level}
          {item.projectId ? " • Project-specific" : " • Default"}
        </div>
      </div>
      {!item.projectId && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="w-10 h-10 px-0"
            icon="edit"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(item);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 px-0 text-accent-600 hover:bg-accent-50"
            icon="delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item._id);
            }}
          />
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
      <div className="py-24">
        <LoadingSpinner size="lg" text="Loading priorities..." />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-neutral-50">
        <PageHeader
          title="Priorities"
          subtitle="Configure and reorder priority levels for your workspace"
          icon="flag"
          badge={`${priorities.length} total`}
          actions={
            user.role === "admin" ? (
              <Button icon="add" onClick={() => handleOpenModal()}>
                Create priority
              </Button>
            ) : null
          }
        />

        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="sm" icon="swap_vert">
                  Drag to reorder
                </Badge>
                <Badge variant="neutral" size="sm" icon="shield">
                  Default items cannot be removed
                </Badge>
              </div>
              <p className="text-sm text-neutral-500">Changes save automatically when you reorder.</p>
            </div>

            {priorities.length === 0 ? (
              <EmptyState
                icon="flag"
                title="No priorities yet"
                description="Create your first priority to manage task importance."
                action={
                  user.role === "admin" ? (
                    <Button icon="add" onClick={() => handleOpenModal()}>
                      Create priority
                    </Button>
                  ) : null
                }
              />
            ) : (
              <div className="rounded-xl border border-neutral-200 overflow-hidden">
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
            )}
          </Card>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-neutral-500">Priority</p>
                <h2 className="text-lg font-semibold text-neutral-900">{currentPriority?._id ? "Edit priority" : "Create priority"}</h2>
              </div>
              <Button variant="ghost" size="sm" icon="close" onClick={handleCloseModal} />
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-neutral-800">
                  Priority name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={currentPriority?.name || ""}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Critical, High, Medium, Low"
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-800">Icon</p>
                <IconPicker
                  icons={PREDEFINED_PRIORITY_ICONS.map((icon) => ({
                    ...icon,
                    component: <IconComponent name={icon.name} />,
                  }))}
                  selectedIcon={currentPriority?.icon || "FaFire"}
                  onSelect={handleIconSelect}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-200">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} icon="save">
                  {isSaving ? "Saving..." : "Save"}
                </Button>
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
