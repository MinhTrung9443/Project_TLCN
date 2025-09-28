import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ProjectContext } from '../../contexts/ProjectContext';
import { getProjectByKey, updateProject } from '../../services/projectService';
import userService from '../../services/userService'; 
import SettingMenu from '../../components/project/ProjectSettingMenu';
import '../../styles/pages/ManageProject/ProjectSettings_General.css';
import { useAuth } from '../../contexts/AuthContext';

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch (error) {
    return '';
  }
};


const ProjectSettingsGeneral  = () => {
    const { user } = useAuth(); 
    const isAdmin = user && user.role === 'admin'; 
    const { projectKey } = useParams();
    const { setSelectedProjectKey } = useContext(ProjectContext);

    const [project, setProject] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        key: '',
        type: 'Scrum',
        description: '',
        projectLeaderId: '',
        startDate: '', 
        endDate: '',   
    });
    
    const [errors, setErrors] = useState({});
    const [allUsers, setAllUsers] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (projectKey) {
            setSelectedProjectKey(projectKey.toUpperCase());
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const [projectResponse, usersResponse] = await Promise.all([
                    getProjectByKey(projectKey),
                    userService.fetchAllUsers()
                ]);

                const projectData = projectResponse.data;
                setProject(projectData);
                setAllUsers(usersResponse);

                setFormData({
                    name: projectData.name,
                    key: projectData.key,
                    type: projectData.type,
                    description: projectData.description || '',
                    projectLeaderId: projectData.projectLeaderId?._id || '',
                    startDate: formatDateForInput(projectData.startDate),
                    endDate: formatDateForInput(projectData.endDate),
                });

            } catch (error) {
                toast.error("Failed to fetch project data or user list.");
                setProject(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectKey, setSelectedProjectKey]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value,
        }));
        if (errors[name]) {
            setErrors(prevErrors => ({
                ...prevErrors,
                [name]: null
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name || formData.name.trim() === '') {
            newErrors.name = 'Project Name is required.';
        }
        if (!formData.key || formData.key.trim() === '') {
            newErrors.key = 'Key is required.';
        }
        // Kiểm tra ngày
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            if (end < start) {
                newErrors.endDate = 'End Date must be on or after the Start Date.';
            }
        }
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Please fix the errors before saving.");
            return; // Dừng việc submit nếu có lỗi
        }
        setErrors({}); 

        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                startDate: formData.startDate || null,
                endDate: formData.endDate || null,
            };
            await updateProject(project._id, payload);
            toast.success('Project updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update project.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCancel = () => {
        setFormData({
            name: project.name,
            key: project.key,
            type: project.type,
            description: project.description || '',
            projectLeaderId: project.projectLeaderId?._id || '',
            startDate: formatDateForInput(project.startDate),
            endDate: formatDateForInput(project.endDate),
        });
        setErrors({}); 
    };

    if (loading) return <div>Loading project settings...</div>;
    if (!project) return <div>Project not found.</div>;

     return (
        <form onSubmit={handleSubmit} className="settings-content-form">
            <div className="form-group">
                <label>Project Name*</label>
                <input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required 
                    disabled={!isAdmin}
                />
                {errors.name && <p className="error-message">{errors.name}</p>}
            </div>
            <div className="form-group">
                <label>Key*</label>
                <input 
                    name="key" 
                    value={formData.key} 
                    onChange={handleChange} 
                    required 
                    disabled={!isAdmin}
                />
                {errors.key && <p className="error-message">{errors.key}</p>}
            </div>
            <div className="form-group">
                <label>Type</label>
                <select 
                    name="type" 
                    value={formData.type} 
                    onChange={handleChange} 
                    disabled={!isAdmin}
                >
                    <option>Scrum</option>
                    <option>Kanban</option>
                </select>
            </div>
            
            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="startDate">Start Date</label>
                    <input
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleChange}
                        disabled={!isAdmin}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="endDate">End Date</label>
                    <input
                        id="endDate"
                        name="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={handleChange}
                        disabled={!isAdmin}
                    />
                    {errors.endDate && <p className="error-message">{errors.endDate}</p>}
                </div>
            </div>

            <div className="form-group">
                <label>Description</label>
                <textarea 
                    name="description" 
                    value={formData.description} 
                    onChange={handleChange} 
                    rows="4"
                    disabled={!isAdmin}
                />
            </div>

             <div className="form-group">
                <label htmlFor="projectLeaderId">Project Manager</label>
                <select
                    id="projectLeaderId"
                    name="projectLeaderId"
                    value={formData.projectLeaderId}
                    onChange={handleChange}
                    disabled={!isAdmin}
                >
                    <option value="">-- Select a Manager --</option>
                    {allUsers.map(u => (
                        <option key={u._id} value={u._id}>
                            {u.fullname} ({u.email})
                        </option>
                    ))}
                </select>
            </div>
            
            {isAdmin && (
                <div className="form-actions">
                    <button type="button" onClick={handleCancel} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            )}
        </form>
    );
};

export default ProjectSettingsGeneral;