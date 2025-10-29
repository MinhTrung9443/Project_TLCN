import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Select from 'react-select';
import { updateTask } from '../../services/taskService';
import { getProjectMember } from '../../services/projectService';
import RichTextEditor from '../common/RichTextEditor'; // Giả sử bạn có component này
import '../../styles/components/TaskDetailPanel.css';
import ActionsMenu from '../common/ActionsMenu';

const TaskDetailPanel = ({
    task,
    onTaskUpdate,
    onClose,
    onTaskDelete,
    onTaskClone,    
    statuses = [],
    priorities = [],
    taskTypes = [],
    sprints = [],
}) => {
    // State nội bộ để quản lý các giá trị đang chỉnh sửa
    const [editableTask, setEditableTask] = useState(task);
    const [projectMembers, setProjectMembers] = useState([]);
    // Cập nhật state nội bộ khi prop `task` từ bên ngoài thay đổi
    useEffect(() => {
        setEditableTask(task);
    if (task?.projectId?.key) {
            const fetchMembers = async () => {
                try {
                    const res = await getProjectMember(task.projectId.key);
                    const memberOptions = res.data.map(member => ({
                        value: member.userId._id,
                        label: member.userId.fullname
                    }));
                    setProjectMembers(memberOptions);
                } catch (error) {
                    toast.error("Could not load project members.");
                    setProjectMembers([]);
                }
            };
            fetchMembers();
        } else {
            setProjectMembers([]); // Reset nếu không có project
        }
    }, [task]);
    
    if (!editableTask) return null;

    // Hàm chung để xử lý việc cập nhật
    const handleUpdate = async (fieldName, value) => {
        const updateValue = value === "" ? null : value;

        // --- BẮT ĐẦU LOGIC VALIDATION ---
        const newStartDate = fieldName === 'startDate' ? updateValue : editableTask.startDate;
        const newDueDate = fieldName === 'dueDate' ? updateValue : editableTask.dueDate;

        // Chỉ kiểm tra khi cả hai ngày đều có giá trị
        if (newStartDate && newDueDate && new Date(newStartDate) > new Date(newDueDate)) {
            toast.error("Start Date cannot be after Due Date.");
            // Không thực hiện cập nhật và không thay đổi UI
            return; 
        }
        // --- KẾT THÚC LOGIC VALIDATION ---
        
        const originalTask = { ...editableTask };
        
        // Cập nhật giao diện trước (optimistic update)
        setEditableTask(prev => ({ ...prev, [fieldName]: updateValue }));

        try {
            const res = await updateTask(editableTask._id, { [fieldName]: updateValue });
            onTaskUpdate(res.data);
            toast.success(`${fieldName.replace(/([A-Z])/g, ' $1')} updated successfully!`);
        } catch (error) {
            toast.error("Update failed. Reverting changes.");
            setEditableTask(originalTask); // Hoàn tác nếu lỗi
        }
    };

    
    const handleDescriptionUpdate = (content) => {
        // Hàm này có thể có debounce để không gọi API liên tục
        handleUpdate('description', content);
    };

    const findOption = (options, field) => {
        if (!field) return null;
        const idToFind = typeof field === 'object' ? field._id : field;
        return options.find(opt => opt.value === idToFind);
    };
    const handleDelete = () => {
        // Hỏi xác nhận trước khi xóa
        if (window.confirm(`Are you sure you want to delete task ${editableTask.key}?`)) {
            onTaskDelete(editableTask._id);
        }
    };

    const handleClone = () => {
        onTaskClone(editableTask._id);
        toast.info("Clone function not implemented yet.");
    };

    const handleAddAttachment = () => {
        toast.info("Add attachment function not implemented yet.");
    };

    return (
        <div className="task-detail-panel">
            <header className="panel-header">
                {/* Cập nhật header */}
                <div className="panel-header-left">
                    <h3>{editableTask.key}: {editableTask.name}</h3>
                </div>
                <div className="panel-header-right">
                    <ActionsMenu
                        onDelete={handleDelete}
                        onClone={handleClone}
                        onAddAttachment={handleAddAttachment}
                    />
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
            </header>
            <main className="panel-body">
                <div className="panel-section">
                    <div className="detail-item-editable">
                        <strong>Progress</strong>
                        <div className="progress-bar-container">
                             <input
                                type="range"
                                min="0"
                                max="100"
                                value={editableTask.progress || 0}
                                className="progress-slider"
                                onChange={(e) => setEditableTask(prev => ({ ...prev, progress: parseInt(e.target.value, 10) }))}
                                onMouseUp={(e) => handleUpdate('progress', parseInt(e.target.value, 10))}
                            />
                            <span>{editableTask.progress || 0}%</span>
                        </div>
                    </div>
                </div>

                <div className="panel-section detail-grid-editable">
                    <div className="detail-item-editable">
                        <strong>Status</strong>
                        <Select
                            value={findOption(statuses, editableTask.statusId?._id)}
                            options={statuses}
                            onChange={(option) => handleUpdate('statusId', option.value)}
                        />
                    </div>
                    <div className="detail-item-editable">
                        <strong>Assignee</strong>
                         <Select
                            // Tìm trong danh sách members đã được lọc
                            value={findOption(projectMembers, editableTask.assigneeId)}
                            options={projectMembers} // Sử dụng danh sách members
                            onChange={(option) => handleUpdate('assigneeId', option ? option.value : null)}
                            isClearable
                            placeholder="Select..."
                        />
                    </div>
                    <div className="detail-item-editable">
                        <strong>Reporter</strong>
                        <Select
                            // Reporter cũng nên là một thành viên của project
                            value={findOption(projectMembers, editableTask.reporterId)}
                            options={projectMembers} // Sử dụng danh sách members
                            onChange={(option) => handleUpdate('reporterId', option.value)}
                            placeholder="Select..."
                        />
                    </div>
                    <div className="detail-item-editable">
                        <strong>Type</strong>
                        <Select
                            value={findOption(taskTypes, editableTask.taskTypeId?._id)}
                            options={taskTypes}
                            onChange={(option) => handleUpdate('taskTypeId', option.value)}
                        />
                    </div>
                    <div className="detail-item-editable">
                        <strong>Priority</strong>
                        <Select
                            value={findOption(priorities, editableTask.priorityId?._id)}
                            options={priorities}
                            onChange={(option) => handleUpdate('priorityId', option.value)}
                        />
                    </div>
                    <div className="detail-item-editable">
                        <strong>Sprint</strong>
                        <Select
                            value={findOption(sprints, editableTask.sprintId?._id)}
                            options={sprints}
                            onChange={(option) => handleUpdate('sprintId', option ? option.value : null)}
                            isClearable
                            placeholder="Backlog"
                        />
                    </div>
                    <div className="detail-item-editable">
                        <strong>Story Point</strong>
                        <input
                            type="number"
                            value={editableTask.storyPoints || ''}
                            onChange={(e) => setEditableTask(prev => ({ ...prev, storyPoints: e.target.value }))}
                            onBlur={(e) => handleUpdate('storyPoints', parseInt(e.target.value, 10) || 0)}
                            className="editable-input"
                            min="0"
                        />
                    </div>
                     <div className="detail-item-editable">
                        <strong>Start Date</strong>
                         <input
                            type="date"
                            value={editableTask.startDate ? new Date(editableTask.startDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleUpdate('startDate', e.target.value)}
                            className="editable-input"
                        />
                    </div>
                    <div className="detail-item-editable">
                        <strong>Due Date</strong>
                         <input
                            type="date"
                            value={editableTask.dueDate ? new Date(editableTask.dueDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleUpdate('dueDate', e.target.value)}
                            className="editable-input"
                        />
                    </div>
                </div>
                
                <div className="panel-section">
                    <h4>Description</h4>
                    {/* Giả sử bạn có component RichTextEditor sẵn sàng */}
                    <RichTextEditor
                        value={editableTask.description || ''}
                        onChange={handleDescriptionUpdate}
                    />
                </div>
                
                 <footer className="panel-footer">
                    <span>Created By: {editableTask.createdById?.fullname || 'N/A'}</span>
                </footer>
            </main>
        </div>
    );
};

export default TaskDetailPanel;