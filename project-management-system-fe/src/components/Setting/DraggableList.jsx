import React, { useState } from "react";
import DraggableItem from "./DraggableItem";
import "../../styles/Setting/DraggableList.css";

const DraggableList = () => {
  const [items, setItems] = useState([
    { icon: "Z", color: "bg-cyan-500", text: "Storyline" },
    { icon: "S", color: "bg-cyan-500", text: "Epic" },
    { icon: "✚", color: "bg-green-500", text: "Story" },
    { icon: "✓", color: "bg-indigo-500", text: "Task" },
    { icon: "□", color: "bg-teal-600", text: "Sub Task" },
    { icon: "B", color: "bg-orange-600", text: "Bug" },
    { icon: "I", color: "bg-yellow-500", text: "Improvement" },
    { icon: "F", color: "bg-blue-600", text: "Feature" },
    { icon: "?", color: "bg-gray-600", text: "Question" },
    { icon: "✓", color: "bg-pink-600", text: "Checklist" },
  ]);

  const moveItem = (fromIndex, toIndex) => {
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    setItems(newItems);
  };

  return (
    <div className="draggable-list">
      <ul>
        {items.map((item, index) => (
          <DraggableItem
            key={index}
            index={index}
            item={item}
            moveItem={moveItem}
          />
        ))}
      </ul>
    </div>
  );
};

export default DraggableList;
