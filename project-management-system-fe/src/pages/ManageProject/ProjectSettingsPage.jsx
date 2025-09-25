import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjects, updateProject } from '../../services/projectService';
import { toast } from 'react-toastify';

const ProjectSettingsPage = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [formData, setFormData] = useState({ name: '', key: '', description: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjectDetails = async () => {
            try {
                const response = await getProjects();
                const currentProject = response.data.find(p => p._id === projectId);
                if (currentProject) {
                    setProject(currentProject);
                    setFormData({
                        name: currentProject.name,
                        key: currentProject.key,
                        description: currentProject.description || '',
                    });
                } else {
                    toast.error("Project not found.");
                    navigate('/task-management/projects');
                }
            } catch (error) {
                toast.error("Failed to fetch project details.");
            } finally {
                setLoading(false);
            }
        };
        fetchProjectDetails();
    }, [projectId, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateProject(projectId, formData);
            toast.success("Project updated successfully!");
            navigate('/task-management/projects');
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update project.");
        }
    };

    if (loading) return <div>Loading project settings...</div>;

    return (
        <div className="settings-page-container" style={{ padding: '2rem' }}>
            <h1>Project Settings: {project?.name}</h1>
            <form onSubmit={handleSubmit} className="settings-form">
                <div className="form-group">
                    <label htmlFor="name">Project Name*</label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="key">Key*</label>
                    <input
                        id="key"
                        name="key"
                        type="text"
                        value={formData.key}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        name="description"
                        rows="4"
                        value={formData.description}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-actions">
                    <button type="button" onClick={() => navigate('/task-management/projects')} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProjectSettingsPage;