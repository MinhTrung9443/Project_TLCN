import React from "react";
import { useDrag, useDrop } from "react-dnd";
import "../../styles/Setting/DraggableItem.css";

const DraggableItem = ({ item, index, moveItem }) => {
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

  return (
    <li
      ref={(node) => drag(drop(node))}
      className={`draggable-item ${isDragging ? "dragging" : ""}`}
    >
      <div className="item-icon">{item.icon}</div>
      <span className="item-text">{item.text}</span>
      <button className="item-action">
        <span className="material-symbols-outlined">more_vert</span>
      </button>
    </li>
  );
};

export default DraggableItem;
