import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import platformService from '../../services/platformService'; // Service mới cho platform
import * as FaIcons from 'react-icons/fa';
import * as VscIcons from 'react-icons/vsc';

import '../../styles/pages/ManageProject/ProjectSettings_TaskType.css'; 

const PREDEFINED_PLATFORM_ICONS = [
    { name: 'FaCode', color: '#8E44AD' },
    { name: 'FaCog', color: '#E74C3C' },
    { name: 'FaCubes', color: '#27AE60' },
    { name: 'FaExpandArrowsAlt', color: '#3498DB' },
    { name: 'FaApple', color: '#95A5A6' },
    { name: 'FaAndroid', color: '#2ECC71' },
    { name: 'FaChartBar', color: '#34495E' },
    { name: 'FaTerminal', color: '#F1C40F' },
    { name: 'FaPalette', color: '#9B59B6' },
    { name: 'FaFlask', color: '#C0392B' },
];
const IconComponent = ({ name }) => {
  const AllIcons = { ...FaIcons, ...VscIcons };
  const Icon = AllIcons[name];
  if (!Icon) return <FaIcons.FaQuestionCircle />;
  return <Icon />;
};

const IconPicker = ({ selectedIcon, onSelect }) => (
  <div className="icon-picker-container">
    {PREDEFINED_PLATFORM_ICONS.map((icon) => (
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

const ProjectSettingPlatform = () => {
    const { projectKey } = useParams();
    const [platforms, setPlatforms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentPlatform, setCurrentPlatform] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuRef = useRef(null);

    const fetchPlatforms = useCallback(async () => {
        try {
            setLoading(true);
            const response = await platformService.getAllPlatforms(projectKey);
            setPlatforms(response.data);
        } catch (error) { toast.error('Failed to fetch platforms.'); } 
        finally { setLoading(false); }
    }, [projectKey]);

    useEffect(() => { fetchPlatforms(); }, [fetchPlatforms]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) setOpenMenuId(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleOpenModal = (platform = null) => {
        setCurrentPlatform(platform ? { ...platform } : { name: '', icon: 'FaCode' });
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const payload = { 
            name: currentPlatform.name, 
            icon: currentPlatform.icon, 
            description: currentPlatform.description,
            projectKey: projectKey 
        };
        try {
            if (currentPlatform._id) {
                await platformService.updatePlatform(currentPlatform._id, payload);
                toast.success('Platform updated!');
            } else {
                await platformService.createPlatform(payload);
                toast.success('Platform created!');
            }
            setIsModalOpen();
            fetchPlatforms();
        } catch (error) { toast.error(error.response?.data?.message || 'An error occurred.'); } 
        finally { setIsSaving(false); }
    };
    
    const handleDelete = async (id) => {
        setOpenMenuId(null);
        if (window.confirm('Are you sure?')) {
            try {
                await platformService.deletePlatform(id);
                toast.success('Platform deleted!');
                fetchPlatforms();
            } catch (error) { toast.error('Failed to delete platform.'); }
        }
    };

    const toggleMenu = (id) => setOpenMenuId(openMenuId === id ? null : id);
    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentPlatform(prev => ({ ...prev, [name]: value }));
    };

    const handleIconSelect = (iconName) => {
        setCurrentPlatform(prev => ({ ...prev, icon: iconName }));
    };
    if (loading) return <div>Loading...</div>;

    return (
        <div className="settings-list-container">
            <div className="settings-list-header">
                <div className="header-col col-icon">Icon</div>
                <div className="header-col col-name">Platform Name</div>
                <div className="header-col col-description">Description</div>
                <div className="header-col col-actions">
                    <button className="btn-add-icon" onClick={() => handleOpenModal()}><VscIcons.VscAdd /></button>
                </div>
            </div>
            <div className="settings-list-body">
                {platforms.map(p => {
                    const iconInfo = PREDEFINED_PLATFORM_ICONS.find(i => i.name === p.icon);
                    return (
                        <div className="settings-list-row" key={p._id}>
                            <div className="row-col col-icon">
                                <span className="icon-wrapper" style={{ backgroundColor: iconInfo?.color || '#7A869A' }}>
                                    <IconComponent name={p.icon} />
                                </span>
                            </div>
                            <div className="row-col col-name">{p.name}</div>
                            <div className="row-col col-description">{p.description || '-'}</div>
                            <div className="row-col col-actions">
                                <div className="action-menu-wrapper" ref={openMenuId === p._id ? menuRef : null}>
                                    <button className="btn-menu-toggle" onClick={() => toggleMenu(p._id)}><FaIcons.FaEllipsisV /></button>
                                    {openMenuId === p._id && (
                                        <div className="action-dropdown-menu">
                                            <button onClick={() => handleOpenModal(p)}>Edit</button>
                                            <button onClick={() => handleDelete(p._id)}>Delete</button>
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
                        <h2>{currentPlatform?._id ? 'Edit Platform' : 'Create Platform'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="name">Name*</label>
                                <input 
                                    id="name" 
                                    name="name" 
                                    value={currentPlatform.name} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                               <label>Icon</label>
                               <IconPicker selectedIcon={currentPlatform.icon} onSelect={handleIconSelect} icons={PREDEFINED_PLATFORM_ICONS} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea 
                                    id="description" 
                                    name="description" 
                                    rows="3" 
                                    value={currentPlatform.description || ''} 
                                    onChange={handleChange}
                                ></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSettingPlatform;
