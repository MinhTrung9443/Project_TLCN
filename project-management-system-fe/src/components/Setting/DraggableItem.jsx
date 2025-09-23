import React, { useState, useRef, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import PopUpCreate from "../common/PopUpCreate";
import "../../styles/Setting/DraggableItem.css";
import typeTaskService from "../../services/typeTaskService";
import platformService from "../../services/platformService";
import priorityService from "../../services/priorityService";

const DraggableItem = ({ item, index, moveItem, onRefresh }) => {
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
          //chua cau hinh
          break;
        case "#platforms":
          await platformService.updatePlatform(item._id, newData);
          break;
        default:
          await typeTaskService.updateTypeTask(item._id, newData);
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
          await typeTaskService.deleteTypeTask(item._id);
          break;
        case "#prioritys":
          await priorityService.deletePriority(item._id);
          break;
        case "#platforms":
          await platformService.deletePlatform(item._id);
          break;

        default:
          await typeTaskService.deleteTypeTask(item._id);
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
        />
      )}
    </li>
  );
};

export default DraggableItem;
