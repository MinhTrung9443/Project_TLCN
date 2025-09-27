import React, { useState, useRef, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import PopUpCreate from "../common/PopUpCreate";
import "../../styles/Setting/DraggableItem.css";
import typeTaskService from "../../services/typeTaskService";
import platformService from "../../services/platformService";
import priorityService from "../../services/priorityService";
import { toast } from "react-toastify";
const DraggableItem = ({ item, index, moveItem, onRefresh, asTableRow }) => {
  const [hashValue, setHashValue] = useState("");
  // Cập nhật hashValue khi url thay đổi
  useEffect(() => {
    const updateHashValue = () => {
      setHashValue(window.location.hash);
    };

    window.addEventListener("hashchange", updateHashValue);
    updateHashValue();
    return () => window.removeEventListener("hashchange", updateHashValue);
  }, []);

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
      switch (hashValue) {
        case "#typetasks":
          await typeTaskService.updateTypeTask(item._id, newData);
          break;
        case "#prioritys":
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
        case "#platforms":
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
      switch (hashValue) {
        case "#typetasks":
          try {
            await typeTaskService.deleteTypeTask(item._id);
            toast.success("Type Task deleted successfully");
          } catch (error) {
            console.error("Error deleting type task:", error);
          }
          break;
        case "#prioritys":
          try {
            await priorityService.deletePriority(item._id);
            toast.success("Priority deleted successfully");
          } catch (error) {
            console.error("Error deleting priority:", error);
          }
          break;
        case "#platforms":
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
      <tr>
        <td>
          <span
            className="material-symbols-outlined"
            style={{ color: "#2563eb", fontSize: 22 }}
          >
            {item.icon}
          </span>
        </td>
        <td>{item.name}</td>
        {"level" in item && <td>{item.level}</td>}
        {"description" in item && <td>{item.description}</td>}
        <td>{item.projectId || ""}</td>
        <td>
          <button className="item-action">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </td>
      </tr>
    );
  }

  return (
    <li
      ref={(node) => drag(drop(node))}
      className={`draggable-item ${isDragging ? "dragging" : ""}`}
    >
      <div className="item-icon">
        <span className="material-symbols-outlined">{item.icon || "task"}</span>
      </div>
      <span className="item-text">{item.name}</span>
      <span className="item-description">{item.description}</span>
      <span className="item-description">{item.level}</span>
      {item.projectId && <span className="item-project">{item.projectId}</span>}
      <button
        className="item-action"
        ref={actionBtnRef}
        onClick={() => setPopupOpen(true)}
      >
        <span className="material-symbols-outlined">more_vert</span>
      </button>

      {/* Popup menu */}
      {popupOpen && (
        <div className="item-popup-menu">
          <button
            className="item-popup-btn"
            onClick={() => {
              setEditOpen(true);
              setPopupOpen(false);
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ marginRight: 6 }}
            >
              edit
            </span>
            Edit
          </button>
          <button
            className="item-popup-btn text-red-600"
            onClick={handleDelete}
          >
            <span
              className="material-symbols-outlined"
              style={{ marginRight: 6 }}
            >
              delete
            </span>
            Delete
          </button>
          <button
            className="item-popup-btn"
            onClick={() => setPopupOpen(false)}
          >
            Close
          </button>
        </div>
      )}

      {/* Popup edit */}
      {editOpen && (
        <PopUpCreate
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSubmit={handleEditSubmit}
          title="Edit Item"
          initialData={item}
          isPri={hashValue === "#prioritys"}
        />
      )}
    </li>
  );
};

export default DraggableItem;
