import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import typeTaskService from '../../services/typeTaskService';
import * as FaIcons from 'react-icons/fa';
import * as VscIcons from 'react-icons/vsc';

import '../../styles/pages/ManageProject/ProjectSettings_TaskType.css';

const PREDEFINED_ICONS = [
    { name: 'FaTasks', color: '#4BADE8' },
    { name: 'FaStar', color: '#2ECC71' },
    { name: 'FaCheckSquare', color: '#5297FF' },
    { name: 'FaRegWindowMaximize', color: '#00A8A2' }, // Giống Sub Task
    { name: 'FaBug', color: '#E44D42' },
    { name: 'FaArrowUp', color: '#F57C00' }, // Giống Improvement
    { name: 'FaBullseye', color: '#654DF7' }, // Giống Feature
    { name: 'FaQuestionCircle', color: '#7A869A' },
    { name: 'FaRegClone', color: '#4BADE8' }, // Giống Task Template
    { name: 'FaEquals', color: '#DE350B' }, // Giống Requirement
    { name: 'FaFileAlt', color: '#00B8D9' },
];

const IconComponent = ({ name }) => {
    const AllIcons = { ...FaIcons, ...VscIcons };
    const Icon = AllIcons[name];
    if (!Icon) return <FaIcons.FaQuestionCircle />;
    return <Icon />;
};

const IconPicker = ({ selectedIcon, onSelect }) => {
    return (
        <div className="icon-picker-container">
            {PREDEFINED_ICONS.map((icon) => (
                <button
                    key={icon.name}
                    type="button"
                    className={`icon-picker-button ${selectedIcon === icon.name ? 'selected' : ''}`}
                    onClick={() => onSelect(icon.name)}
                >
                    <div className="icon-display" style={{ backgroundColor: icon.color }}>
                        <IconComponent name={icon.name} />
                    </div>
                </button>
            ))}
        </div>
    );
};


const ProjectSettingTaskType = () => {
    const { projectKey } = useParams();
    const [taskTypes, setTaskTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentTaskType, setCurrentTaskType] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuRef = useRef(null);

    const fetchTaskTypes = useCallback(async () => {
        try {
            setLoading(true);
            const response = await typeTaskService.getAllTypeTask(projectKey);
            setTaskTypes(response.data);
        } catch (error) { toast.error('Failed to fetch task types.'); } 
        finally { setLoading(false); }
    }, [projectKey]);

    useEffect(() => { fetchTaskTypes(); }, [fetchTaskTypes]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) setOpenMenuId(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleOpenModal = (taskType = null) => {
        setCurrentTaskType(taskType ? { ...taskType } : { name: '', icon: 'FaTasks', description: '' });
        setIsModalOpen(true);
        setOpenMenuId(null);
    };
    const handleCloseModal = () => setIsModalOpen(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentTaskType(prev => ({ ...prev, [name]: value }));
    };

    const handleIconSelect = (iconName) => {
        setCurrentTaskType(prev => ({ ...prev, icon: iconName }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const payload = {
            name: currentTaskType.name,
            icon: currentTaskType.icon,
            description: currentTaskType.description,
        };
        try {
            if (currentTaskType._id) {
                await typeTaskService.updateTypeTask(currentTaskType._id, payload);
                toast.success('Task type updated successfully!');
            } else {
                await typeTaskService.createTypeTask({ ...payload, projectKey });
                toast.success('Task type created successfully!');
            }
            handleCloseModal(); fetchTaskTypes();
        } catch (error) { toast.error(error.response?.data?.error || 'An error occurred.'); } 
        finally { setIsSaving(false); }
    };

    const handleDelete = async (taskTypeId) => {
        setOpenMenuId(null);
        if (window.confirm('Are you sure you want to delete this task type?')) {
            try {
                await typeTaskService.deleteTypeTask(taskTypeId);
                toast.success('Task type deleted successfully!');
                fetchTaskTypes();
            } catch (error) { toast.error('Failed to delete task type.'); }
        }
    };

    const toggleMenu = (taskTypeId) => setOpenMenuId(openMenuId === taskTypeId ? null : taskTypeId);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="settings-list-container">
            <div className="settings-list-header">
                <div className="header-col col-icon">Icon</div>
                <div className="header-col col-name">Task Type</div>
                <div className="header-col col-description">Description</div>
                <div className="header-col col-actions">
                    <button className="btn-add-icon" onClick={() => handleOpenModal()}><VscIcons.VscAdd /></button>
                </div>
            </div>
            <div className="settings-list-body">
                {taskTypes.map(tt => {
                    const iconInfo = PREDEFINED_ICONS.find(i => i.name === tt.icon);
                    const iconColor = iconInfo ? iconInfo.color : '#4BADE8'; // Màu mặc định
                    return (
                        <div className="settings-list-row" key={tt._id}>
                            <div className="row-col col-icon">
                                <span className="icon-wrapper" style={{ backgroundColor: iconColor }}>
                                    <IconComponent name={tt.icon} />
                                </span>
                            </div>
                            <div className="row-col col-name">{tt.name}</div>
                            <div className="row-col col-description">{tt.description || '-'}</div>
                            <div className="row-col col-actions">
                                <div className="action-menu-wrapper" ref={openMenuId === tt._id ? menuRef : null}>
                                    <button className="btn-menu-toggle" onClick={() => toggleMenu(tt._id)}><FaIcons.FaEllipsisV /></button>
                                    {openMenuId === tt._id && (
                                        <div className="action-dropdown-menu">
                                            <button onClick={() => handleOpenModal(tt)}>Edit</button>
                                            <button onClick={() => handleDelete(tt._id)}>Delete</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                 <div className="modal-overlay">
                 <div className="modal-content">
                     <h2>{currentTaskType._id ? 'Edit Task Type' : 'Create Task Type'}</h2>
                     <form onSubmit={handleSubmit}>
                         <div className="form-group">
                             <label htmlFor="name">Task Type*</label>
                             <input id="name" name="name" value={currentTaskType.name} onChange={handleChange} required/>
                         </div>
                         
                         <div className="form-group">
                            <label>Icon</label>
                            <IconPicker
                                selectedIcon={currentTaskType.icon}
                                onSelect={handleIconSelect}
                            />
                         </div>

                         <div className="form-group">
                             <label htmlFor="description">Description</label>
                             <textarea id="description" name="description" rows="3" value={currentTaskType.description || ''} onChange={handleChange}></textarea>
                         </div>
                         <div className="modal-actions">
                             <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                             <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
                         </div>
                     </form>
                 </div>
             </div>
            )}
        </div>
    );
};

export default ProjectSettingTaskType;