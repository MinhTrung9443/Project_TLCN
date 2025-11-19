// src/pages/ManageProject/ProjectSettingsGeneral.jsx
// [PHIÊN BẢN HOÀN THIỆN]

import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ProjectContext } from '../../contexts/ProjectContext';
import { updateProjectByKey } from '../../services/projectService'; // Service API để cập nhật
import '../../styles/pages/ManageProject/ProjectSettings_General.css';

// Hàm helper để định dạng ngày tháng
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch (error) {
    return '';
  }
};

const ProjectSettingsGeneral = () => {
    // Chỉ lấy những gì cần thiết từ Context. Không cần gọi setProjectKey ở đây nữa.
    const { projectData, userProjectRole } = useContext(ProjectContext);
    const { projectKey } = useParams(); // Vẫn cần để gọi API update

    // Quyền chỉnh sửa được quyết định bởi vai trò trong dự án
    const canEdit = userProjectRole === 'PROJECT_MANAGER';

    const [formData, setFormData] = useState({
        name: '',
        key: '',
        type: '',
        description: '',
        projectManagerId: '',
        startDate: '',
        endDate: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    // useEffect này chỉ chạy khi `projectData` từ Context thay đổi (được nạp bởi component cha)
    useEffect(() => {
        if (projectData) {
            // Tìm Project Manager từ mảng members
            const projectManager = projectData.members.find(m => m.role === 'PROJECT_MANAGER');

            setFormData({
                name: projectData.name || '',
                key: projectData.key || '',
                type: projectData.type || 'Scrum',
                description: projectData.description || '',
                projectManagerId: projectManager?.userId?._id || '',
                startDate: formatDateForInput(projectData.startDate),
                endDate: formatDateForInput(projectData.endDate),
            });
        }
    }, [projectData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canEdit) return; // Chặn submit nếu không có quyền

        setIsSaving(true);
        try {
            const payload = { ...formData, startDate: formData.startDate || null, endDate: formData.endDate || null };
            await updateProjectByKey(projectKey, payload);
            toast.success('Project updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update project.');
        } finally {
            setIsSaving(false);
        }
    };

    // Hàm reset form về trạng thái ban đầu
    const handleCancel = () => {
        if (projectData) {
             const projectManager = projectData.members.find(m => m.role === 'PROJECT_MANAGER');
             setFormData({
                name: projectData.name || '',
                key: projectData.key || '',
                type: projectData.type || 'Scrum',
                description: projectData.description || '',
                projectManagerId: projectManager?.userId?._id || '',
                startDate: formatDateForInput(projectData.startDate),
                endDate: formatDateForInput(projectData.endDate),
            });
        }
    };

    // Component này không cần xử lý loading/not found nữa, vì component cha đã làm
    if (!projectData) {
        // Có thể hiển thị một skeleton loader nhỏ ở đây trong khi chờ projectData
        return <div>Loading general settings...</div>;
    }

    const projectMembers = projectData.members || [];

    return (
        <form onSubmit={handleSubmit} className="settings-content-form">
            <div className="form-group">
                <label>Project Name*</label>
                <input name="name" value={formData.name} onChange={handleChange} required disabled={!canEdit} />
            </div>
            <div className="form-group">
                <label>Key*</label>
                <input name="key" value={formData.key} onChange={handleChange} required disabled={!canEdit} />
            </div>
            <div className="form-group">
                <label>Type</label>
                <select name="type" value={formData.type} onChange={handleChange} disabled={!canEdit}>
                    <option value="Scrum">Scrum</option>
                    <option value="Kanban">Kanban</option>
                </select>
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="startDate">Start Date</label>
                    <input id="startDate" name="startDate" type="date" value={formData.startDate} onChange={handleChange} disabled={!canEdit} />
                </div>
                <div className="form-group">
                    <label htmlFor="endDate">End Date</label>
                    <input id="endDate" name="endDate" type="date" value={formData.endDate} onChange={handleChange} disabled={!canEdit} />
                </div>
            </div>
            <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="4" disabled={!canEdit} />
            </div>
            <div className="form-group">
                <label htmlFor="projectManagerId">Project Manager</label>
                <select id="projectManagerId" name="projectManagerId" value={formData.projectManagerId} onChange={handleChange} disabled={!canEdit}>
                    <option value="">-- Select a Manager --</option>
                    {projectMembers.map(member => (
                        <option key={member.userId._id} value={member.userId._id}>
                            {member.userId.fullname} ({member.userId.email})
                        </option>
                    ))}
                </select>
            </div>
            {canEdit && (
                <div className="form-actions">
                    <button type="button" onClick={handleCancel} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            )}
        </form>
    );
};

export default ProjectSettingsGeneral;