// src/components/task/LinkedTasksTab.jsx

import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { IconComponent } from '../common/IconPicker';
import { FaTrash } from 'react-icons/fa';

const PREDEFINED_TASKTYPE_ICONS_MAP = {
    "FaBug": "#E44D42",
    "FaTasks": "#4BADE8",
    "FaStar": "#2ECC71",
    "FaCheckSquare": "#5297FF",
};

const LinkTypeOptions = [
    { value: 'relates to', label: 'relates to' },
    { value: 'blocks', label: 'blocks' },
    { value: 'is blocked by', label: 'is blocked by' },
    { value: 'clones', label: 'clones' },
    { value: 'is cloned by', label: 'is cloned by' },
    { value: 'duplicates', label: 'duplicates' },
    { value: 'is duplicated by', label: 'is duplicated by' },
];

const LinkedTasksTab = ({ task, allProjectTasks, onLink, onUnlink }) => {
    const [selectedLinkType, setSelectedLinkType] = useState(LinkTypeOptions[0]);
    const [selectedTaskToLink, setSelectedTaskToLink] = useState(null);
    const [isLinking, setIsLinking] = useState(false);

    const taskOptions = useMemo(() => {
        // Thêm phòng thủ để không bao giờ crash
        const linkedTasks = task.linkedTasks || [];
        const linkedTaskIds = new Set(linkedTasks.map(link => link.taskId._id));
        return (allProjectTasks || [])
            .filter(t => t._id !== task._id && !linkedTaskIds.has(t._id))
            .map(t => ({
                value: t._id,
                label: `${t.key}: ${t.name}`,
            }));
    }, [allProjectTasks, task]);

    const handleLink = async () => {
        if (!selectedTaskToLink || !selectedLinkType) {
            toast.warn("Please select a link type and a task.");
            return;
        }
        setIsLinking(true);
        try {
            await onLink(selectedTaskToLink.value, selectedLinkType.value);
            setSelectedTaskToLink(null);
        } catch (error) {
        } finally {
            setIsLinking(false);
        }
    };

    const handleUnlink = async (linkId) => {
        await onUnlink(linkId);
    };
    const getIconInfo = (taskTypeId) => {
        if (!taskTypeId || !taskTypeId.icon) return { color: '#ccc' };
        return { color: PREDEFINED_TASKTYPE_ICONS_MAP[taskTypeId.icon] || '#7A869A' };
    };

    return (
        <div className="linked-tasks-section">
            <h4>Linked Tasks</h4>
            <div className="add-link-form">
                <Select
                    className="link-type-select"
                    value={selectedLinkType}
                    onChange={setSelectedLinkType}
                    options={LinkTypeOptions}
                />
                <Select
                    className="link-task-select"
                    value={selectedTaskToLink}
                    onChange={setSelectedTaskToLink}
                    options={taskOptions}
                    placeholder="Search for task to link..."
                    isClearable
                />
                <button onClick={handleLink} disabled={isLinking || !selectedTaskToLink} className="link-btn">
                    {isLinking ? 'Linking...' : 'Link'}
                </button>
            </div>

             <ul className="linked-tasks-list">
                {(task.linkedTasks || []).map(link => {
                    const linkedTaskInfo = link.taskId;
                    if (!linkedTaskInfo) return null;
                    const iconInfo = getIconInfo(linkedTaskInfo.taskTypeId);
                    return (
                        <li key={link._id} className="linked-task-item">
                            <span className="link-relation">{link.type}</span>
                            <div className="linked-task-details">
                                <span
                                    className="icon-wrapper-list-small"
                                    style={{ backgroundColor: iconInfo.color }}
                                    title={linkedTaskInfo.taskTypeId?.name}
                                >
                                    <IconComponent name={linkedTaskInfo.taskTypeId?.icon || 'FaTasks'} />
                                </span>
                                <span className="linked-task-key">{linkedTaskInfo.key}</span>
                                <span className="linked-task-name">{linkedTaskInfo.name}</span>
                            </div>
                            <button onClick={() => handleUnlink(link._id)} className="unlink-btn">
                                <FaTrash />
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    );
};

export default LinkedTasksTab;