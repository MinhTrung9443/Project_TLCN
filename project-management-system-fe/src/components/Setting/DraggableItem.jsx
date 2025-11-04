import { useState, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import PopUpCreate from "../common/PopUpCreate";
import "../../styles/Setting/DraggableItem.css";
import typeTaskService from "../../services/typeTaskService";
import platformService from "../../services/platformService";
import priorityService from "../../services/priorityService";
import { toast } from "react-toastify";
const DraggableItem = ({ item, index, moveItem, onRefresh, asTableRow, currentTab }) => {
  const [{ isDragging }, drag] = useDrag({
    type: "ITEM",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "ITEM",
    hover: (draggedItem) => {
      if (draggedItem.index !== index) {
        moveItem(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  // Popup state
  const [popupOpen, setPopupOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Handle edit submit
  const handleEditSubmit = async (newData) => {
    try {
      switch (currentTab) {
        case "tasktypes":
          await typeTaskService.updateTypeTask(item._id, newData);
          break;
        case "prioritys":
          const newPriData = {
            name: newData.name,
            icon: newData.icon,
            level: item.level,
          };
          try {
            await priorityService.updatePriority(item._id, newPriData);
            toast.success("Priority updated successfully");
          } catch (error) {
            console.error("Error updating priority:", error);
          }
          break;
        case "platforms":
          try {
            await platformService.updatePlatform(item._id, newData);
            toast.success("Platform updated successfully");
          } catch (error) {
            console.error("Error updating platform:", error);
          }
          break;
        default:
          try {
            await typeTaskService.updateTypeTask(item._id, newData);
            toast.success("Update Type Task success.");
          } catch (error) {
            console.error("Error updating type task:", error);
          }
          break;
      }
      setEditOpen(false);
      setPopupOpen(false);
      if (onRefresh) onRefresh(); // cập nhật lại danh sách
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      switch (currentTab) {
        case "tasktypes":
          try {
            await typeTaskService.deleteTypeTask(item._id);
            toast.success("Type Task deleted successfully");
          } catch (error) {
            console.error("Error deleting type task:", error);
          }
          break;
        case "prioritys":
          try {
            await priorityService.deletePriority(item._id);
            toast.success("Priority deleted successfully");
          } catch (error) {
            console.error("Error deleting priority:", error);
          }
          break;
        case "platforms":
          try {
            await platformService.deletePlatform(item._id);
            toast.success("Platform deleted successfully");
          } catch (error) {
            console.error("Error deleting platform:", error);
          }
          break;

        default:
          try {
            await typeTaskService.deleteTypeTask(item._id);
            toast.success("Type Task deleted successfully");
          } catch (error) {
            console.error("Error deleting type task:", error);
          }
          break;
      }
      setPopupOpen(false);
      if (onRefresh) onRefresh(); // cập nhật lại danh sách
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  // Position popup menu
  const actionBtnRef = useRef(null);

  if (asTableRow) {
    return (
      <tr className="settings-table-row">
        <td className="col-drag">
          <span className="material-symbols-outlined drag-handle">drag_indicator</span>
        </td>
        <td className="col-icon">
          <div className="icon-wrapper" style={{ backgroundColor: item.color || "#6366f1" }}>
            <span className="material-symbols-outlined">{item.icon || "task"}</span>
          </div>
        </td>
        <td className="col-name">
          <span className="item-name-text">{item.name}</span>
        </td>
        {"level" in item && (
          <td className="col-level">
            <span className="level-badge">{item.level}</span>
          </td>
        )}
        {"description" in item && (
          <td className="col-description">
            <span className="description-text">{item.description || "-"}</span>
          </td>
        )}
        <td className="col-status">
          <span className="status-badge default">Default</span>
        </td>
        <td className="col-actions">
          <button
            className="action-btn edit-btn"
            onClick={() => {
              setEditOpen(true);
            }}
            title="Edit"
          >
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button className="action-btn delete-btn" onClick={handleDelete} title="Delete">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </td>
      </tr>
    );
  }

  return (
    <li ref={(node) => drag(drop(node))} className={`draggable-item ${isDragging ? "dragging" : ""}`}>
      <div className="item-drag-handle">
        <span className="material-symbols-outlined">drag_indicator</span>
      </div>
      <div className="item-icon" style={{ backgroundColor: item.color || "#6366f1" }}>
        <span className="material-symbols-outlined">{item.icon || "task"}</span>
      </div>
      <span className="item-text">{item.name}</span>
      {item.description && <span className="item-description">{item.description}</span>}
      {item.level && <span className="item-level">Level {item.level}</span>}
      <span className="item-status">Default</span>
      <div className="item-actions">
        <button className="action-btn edit-btn" onClick={() => setEditOpen(true)} title="Edit">
          <span className="material-symbols-outlined">edit</span>
        </button>
        <button className="action-btn delete-btn" onClick={handleDelete} title="Delete">
          <span className="material-symbols-outlined">delete</span>
        </button>
      </div>

      {/* Popup edit */}
      {editOpen && (
        <PopUpCreate
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSubmit={handleEditSubmit}
          title="Edit Item"
          initialData={item}
          isPri={currentTab === "prioritys"}
        />
      )}
    </li>
  );
};

export default DraggableItem;
