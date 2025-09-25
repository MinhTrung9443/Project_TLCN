import React, { useState } from "react";
import DraggableItem from "./DraggableItem";
import "../../styles/Setting/DraggableList.css";
import priorityService from "../../services/priorityService.js";
import { toast } from "react-toastify";
const DraggableList = ({ items, onRefresh }) => {
  const [list, setList] = useState(items);
  const [hashValue, setHashValue] = useState(window.location.hash);

  React.useEffect(() => {
    setHashValue(window.location.hash);
  }, [window.location.hash]);
  // Cập nhật lại danh sách khi kéo thả
  const moveItem = (from, to) => {
    const updated = [...list];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);

    // Kiểm tra nếu là tab Prioritys thì cập nhật lại level
    if (hashValue.replace("#", "").toLowerCase() === "prioritys") {
      updated.forEach((item, idx) => {
        item.level = idx + 1;
      });
      updateLevels(updated);
    }

    setList(updated);
  };

  const updateLevels = async (items) => {
    try {
      await priorityService.updatePriorityLevels(items);
      toast.success("Priority levels updated successfully");
    } catch (error) {
      toast.error("Failed to update priority levels.");
    }
  };

  React.useEffect(() => {
    const sorted = [...items].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    setList(sorted);
  }, [items]);

  return (
    <div className="draggable-list">
      <ul>
        <li className="draggable-header">
          <div className="item-icon">Icon</div>
          <span className="item-text">Name</span>
          {hashValue === "#prioritys" && (
            <span className="item-level">Level</span>
          )}
          {!hashValue === "#prioritys" && (
            <span className="item-description">Description</span>
          )}

          <span className="item-description">Level</span>
          <span className="item-project">Project</span>
          <span className="item-action"></span>
        </li>
        {list.map((item, index) => (
          <DraggableItem
            key={index}
            item={item}
            index={index}
            moveItem={moveItem}
            onRefresh={onRefresh}
          />
        ))}
      </ul>
    </div>
  );
};

export default DraggableList;
