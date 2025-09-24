import React, { useState } from "react";
import DraggableItem from "./DraggableItem";
import "../../styles/Setting/DraggableList.css";
import priorityService from "../../services/priorityService.js";
import { toast } from "react-toastify";
const DraggableList = ({ items, onRefresh }) => {
  const [list, setList] = useState(items);

  // Cập nhật lại danh sách khi kéo thả
  const moveItem = (from, to) => {
    const updated = [...list];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);

    // Kiểm tra nếu là tab Prioritys thì cập nhật lại level
    if (window.location.hash.replace("#", "").toLowerCase() === "prioritys") {
      updated.forEach((item, idx) => {
        item.level = idx + 1;
      });
      updateLevels(updated);
    }

    setList(updated);
  };

  const updateLevels = async (items) => {
    try {
      console.log("Updating priority levels with items:", items);
      await priorityService.updatePriorityLevels(items);
      toast.success("Priority levels updated successfully");
    } catch (error) {
      console.error("Error updating priority levels:", error);
      toast.error("Failed to update priority levels.");
    }
  };

  // Nếu items thay đổi từ props, cập nhật lại list
  React.useEffect(() => {
    setList(items);
  }, [items]);

  return (
    <div className="draggable-list">
      <ul>
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
