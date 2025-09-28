// src/components/Setting/DraggableList.jsx
import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import * as FaIcons from 'react-icons/fa';
import '../../styles/Setting/DraggableList.css'; // Sẽ tạo file CSS này ở bước sau

const ItemType = 'LIST_ITEM'; // Định nghĩa một loại item để kéo thả

// Helper render icon
const IconComponent = ({ name }) => {
    const Icon = FaIcons[name];
    return Icon ? <Icon /> : <FaIcons.FaQuestionCircle />;
};

// Component cho mỗi dòng trong danh sách
const DraggableItem = ({ item, index, moveItem }) => {
    const ref = React.useRef(null);

    const [, drop] = useDrop({
        accept: ItemType,
        hover(draggedItem) {
            if (draggedItem.index !== index) {
                moveItem(draggedItem.index, index);
                draggedItem.index = index;
            }
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: ItemType,
        item: { id: item._id, index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    drag(drop(ref));

    return (
        <div ref={ref} className="settings-row" style={{ opacity: isDragging ? 0.5 : 1 }}>
            <div className="settings-col col-icon">
                <IconComponent name={item.icon} />
            </div>
            <div className="settings-col col-name">{item.name}</div>
            <div className="settings-col col-description">{item.description}</div>
            <div className="settings-col col-project">
                {item.projectId ? item.projectId.name : 'Default'}
            </div>
            <div className="settings-col col-actions">
                <button className="btn-action-menu"><FaIcons.FaEllipsisH /></button>
            </div>
        </div>
    );
};


const DraggableList = ({ items, onRefresh, currentTab }) => {
    // Tạm thời chưa xử lý logic kéo thả, chỉ dựng giao diện
    const moveItem = (fromIndex, toIndex) => {
        console.log(`Move item from ${fromIndex} to ${toIndex}`);
    };

    return (
        <div className="settings-container">
            <div className="settings-header">
                <div className="settings-col col-icon">Icon</div>
                <div className="settings-col col-name">Name</div>
                <div className="settings-col col-description">Description</div>
                <div className="settings-col col-project">Project</div>
                <div className="settings-col col-actions"></div>
            </div>
            <div className="settings-body">
                {items.map((item, index) => (
                    <DraggableItem
                        key={item._id}
                        item={item}
                        index={index}
                        moveItem={moveItem}
                    />
                ))}
            </div>
        </div>
    );
};

export default DraggableList;