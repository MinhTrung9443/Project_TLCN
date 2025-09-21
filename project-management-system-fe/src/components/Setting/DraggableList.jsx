import React, { useState } from "react";
import DraggableItem from "./DraggableItem";
import "../../styles/Setting/DraggableList.css";

const DraggableList = ({ items, onRefresh }) => {
  const [list, setList] = useState(items);

  // Cập nhật lại danh sách khi kéo thả
  const moveItem = (from, to) => {
    const updated = [...list];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setList(updated);
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
