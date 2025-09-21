import React, { useState, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import PopUpCreate from "../common/PopUpCreate";
import "../../styles/Setting/DraggableItem.css";
import typeTaskService from "../../services/typeTaskService";

const ICONS = [
  "task",
  "star",
  "bolt",
  "check_circle",
  "calendar_month",
  "bug_report",
];

const DraggableItem = ({ item, index, moveItem, onRefresh }) => {
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
      await typeTaskService.updateTypeTask(item._id, newData);
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
      await typeTaskService.deleteTypeTask(item._id);
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
