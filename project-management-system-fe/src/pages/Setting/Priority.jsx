import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import priorityService from '../../services/priorityService';
import * as FaIcons from 'react-icons/fa';
import * as VscIcons from 'react-icons/vsc';
import { useDrag, useDrop } from 'react-dnd'; 
import '../../styles/pages/ManageProject/ProjectSettings_TaskType.css';


// DANH SÁCH ICON CHO PRIORITY
const PREDEFINED_PRIORITY_ICONS = [
    { name: 'FaFire', color: '#CD1317' },
    { name: 'FaExclamationCircle', color: '#E94F37' },
    { name: 'FaArrowUp', color: '#F4A261' },
    { name: 'FaArrowAltCircleUp', color: '#F57C00' },
    { name: 'FaEquals', color: '#2A9D8F' },
    { name: 'FaPlusCircle', color: '#45B8AC' },
    { name: 'FaMinusCircle', color: '#264653' },
    { name: 'FaArrowDown', color: '#2196F3' },
    { name: 'FaArrowAltCircleDown', color: '#03A9F4' },
    { name: 'FaExclamationTriangle', color: '#FFB300' },
];

const IconComponent = ({ name }) => {
    const AllIcons = { ...FaIcons, ...VscIcons };
    const Icon = AllIcons[name];
    if (!Icon) return <FaIcons.FaQuestionCircle />;
    return <Icon />;
};

const IconPicker = ({ selectedIcon, onSelect }) => (
    <div className="icon-picker-container">
        {PREDEFINED_PRIORITY_ICONS.map((icon) => (
            <button key={icon.name} type="button"
                className={`icon-picker-button ${selectedIcon === icon.name ? 'selected' : ''}`}
                onClick={() => onSelect(icon.name)}>
                <div className="icon-display" style={{ backgroundColor: icon.color }}>
                    <IconComponent name={icon.name} />
                </div>
            </button>
        ))}
    </div>
);

// (Bạn có thể tách ra file DraggablePriorityItem.jsx riêng nếu muốn)
const DraggablePriorityItem = ({ item, index, moveItem, openEditModal }) => {
    const ref = React.useRef(null);
    const ItemType = 'PRIORITY_ITEM';

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
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });

    drag(drop(ref));
    const iconInfo = PREDEFINED_PRIORITY_ICONS.find(i => i.name === item.icon);

    return (
        <div ref={ref} className="settings-list-row" style={{ opacity: isDragging ? 0.5 : 1 }}>
            <div className="row-col col-icon">
                <span className="icon-wrapper" style={{ backgroundColor: iconInfo?.color || '#7A869A' }}>
                    <IconComponent name={item.icon} />
                </span>
            </div>
            <div className="row-col col-name">{item.name}</div>
            <div className="row-col col-actions">
                <button className="btn-menu-toggle" onClick={() => openEditModal(item)}><FaIcons.FaEllipsisV /></button>
                {/* Có thể thêm menu dropdown Edit/Delete ở đây */}
            </div>
        </div>
    );
};


// --- COMPONENT CHÍNH ---
export const SettingsPriorities = () => {
    const [priorities, setPriorities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentPriority, setCurrentPriority] = useState(null);

    const fetchPriorities = useCallback(async () => {
        try {
            setLoading(true);
            // Gọi API không cần projectKey để lấy global priorities
            const response = await priorityService.getAllPriorities();
            setPriorities(response.data);
        } catch (error) { toast.error('Failed to fetch priorities.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchPriorities(); }, [fetchPriorities]);

    const handleOpenModal = (priority = null) => {
        setCurrentPriority(priority ? { ...priority } : { name: '', icon: 'FaFire' });
        setIsModalOpen(true);
    };
    const handleCloseModal = () => setIsModalOpen(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentPriority(prev => ({ ...prev, [name]: value }));
    };

    const handleIconSelect = (iconName) => {
        setCurrentPriority(prev => ({ ...prev, icon: iconName }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const payload = {
            name: currentPriority.name,
            icon: currentPriority.icon,
        };
        try {
            if (currentPriority._id) {
                await priorityService.updatePriority(currentPriority._id, payload);
                toast.success('Priority updated!');
            } else {
                await priorityService.createPriority(payload);
                toast.success('Priority created!');
            }
            handleCloseModal();
            fetchPriorities();
        } catch (error) { toast.error(error.response?.data?.message || 'An error occurred.'); }
        finally { setIsSaving(false); }
    };
    
    const movePriority = useCallback(async (dragIndex, hoverIndex) => {
        const newPriorities = [...priorities];
        const [draggedItem] = newPriorities.splice(dragIndex, 1);
        newPriorities.splice(hoverIndex, 0, draggedItem);
        
        const updatedItemsWithLevel = newPriorities.map((item, index) => ({
            ...item,
            level: index + 1 
        }));

        setPriorities(updatedItemsWithLevel); 

        try {
            await priorityService.updatePriorityLevels(updatedItemsWithLevel);
            // Không cần toast success để tránh làm phiền
        } catch (error) {
            toast.error("Failed to save new order. Reverting.");
            fetchPriorities(); // Lấy lại thứ tự đúng nếu có lỗi
        }
    }, [priorities, fetchPriorities]);

    if (loading) return <div>Loading...</div>;

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="settings-list-container">
                <div className="header-actions">
                    <h3>Manage Global Priorities</h3>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        + Add Priority
                    </button>
                </div>
                <div className="settings-list-body">
                    {priorities.map((item, index) => (
                        <DraggablePriorityItem
                            key={item._id}
                            item={item}
                            index={index}
                            moveItem={movePriority}
                            openEditModal={handleOpenModal}
                        />
                    ))}
                </div>
            </div>

             {isModalOpen && (
                 <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{currentPriority._id ? 'Edit Priority' : 'Create Priority'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="name">Priority Name*</label>
                                <input id="name" name="name" value={currentPriority.name} onChange={handleChange} required/>
                            </div>
                            <div className="form-group">
                               <label>Icon</label>
                               <IconPicker selectedIcon={currentPriority.icon} onSelect={handleIconSelect}/>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DndProvider>
    );
};
export default SettingsPriorities;