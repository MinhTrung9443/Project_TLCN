import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { ProjectContext } from '../../contexts/ProjectContext';
import { getProjects } from '../../services/projectService';
import { getCreateTaskFormData } from '../../services/settingsService';
import { createTask } from '../../services/taskService';
import RichTextEditor from '../common/RichTextEditor';
import '../../styles/components/CreateTaskModal.css';

const INITIAL_FORM_STATE = {
  projectId: '',
  taskTypeId: '',
  name: '',
  description: '',
  priorityId: '',
  assigneeId: '',
  reporterId: '',
  storyPoints: '',
  dueDate: '',
  platformId: ''
};

const CreateTaskModal = ({ isOpen, onClose, onTaskCreated }) => {
  const { user } = useAuth();
  const { selectedProjectKey } = useContext(ProjectContext);

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [projects, setProjects] = useState([]);
  const [settings, setSettings] = useState({ taskTypes: [], priorities: [], members: [], platforms: [] });
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      const fetchAllProjects = async () => {
        try {
          const res = await getProjects();
          setProjects(res.data);
          const currentProject = res.data.find(p => p.key.toUpperCase() === selectedProjectKey?.toUpperCase());
          if (currentProject) {
            setFormData(prev => ({ ...prev, projectId: currentProject._id, reporterId: user.id }));
          }
        } catch (error) {
          toast.error("Could not fetch projects.");
        }
      };
      fetchAllProjects();
    } else {
      setFormData(INITIAL_FORM_STATE);
      setErrors({});
      setShowMore(false);
    }
  }, [isOpen, selectedProjectKey, user.id]);

  useEffect(() => {
    const fetchSettingsForProject = async () => {
      const selectedProject = projects.find(p => p._id === formData.projectId);
      if (!selectedProject) {
        setSettings({ taskTypes: [], priorities: [], members: [], platforms: [] });
        return;
      }

      try {
        const res = await getCreateTaskFormData(selectedProject.key); 
        setSettings(res.data);
        
        if (res.data.priorities && res.data.priorities.length > 0) {
          const defaultPriority = res.data.priorities.find(p => p.name.toLowerCase() === 'medium') || res.data.priorities[0];
          setFormData(prev => ({ ...prev, priorityId: defaultPriority._id }));
        }

      } catch (error) {
        toast.error(`Could not fetch settings for ${selectedProject.name}.`);
      }
    };

    if (formData.projectId) {
      fetchSettingsForProject();
    }
  }, [formData.projectId, projects]); // Phụ thuộc vào `formData.projectId`

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'projectId') {
      setFormData(prev => ({
        ...INITIAL_FORM_STATE, // Reset về trạng thái ban đầu
        reporterId: user.id, // Giữ lại reporter
        projectId: value,      // Cập nhật projectId mới
        name: prev.name,       // Giữ lại tên và mô tả đã gõ
        description: prev.description
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDescriptionChange = (content) => {
    setFormData(prev => ({ ...prev, description: content }));
  };
  
  const validateForm = () => {
    const newErrors = {};
    if (!formData.projectId) newErrors.projectId = "Project is required.";
    if (!formData.taskTypeId) newErrors.taskTypeId = "Type is required.";
    if (!formData.name.trim()) newErrors.name = "Task Name is required.";
    if (!formData.priorityId) newErrors.priorityId = "Priority is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
        Object.keys(formData).forEach(key => {
  if (formData[key] === '') {
    delete formData[key];
  }
});
      const res = await createTask(formData);
      toast.success("Task created successfully!");
      onTaskCreated(res.data);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create task.");
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <header className="modal-header">
          <h2>Create Task</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </header>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="projectId">Project *</label>
              <select id="projectId" name="projectId" value={formData.projectId} onChange={handleInputChange}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              {errors.projectId && <p className="error-text">{errors.projectId}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="taskTypeId">Type *</label>
              <select id="taskTypeId" name="taskTypeId" value={formData.taskTypeId} onChange={handleInputChange} disabled={!formData.projectId}>
                <option value="">Select Type</option>
                {settings.taskTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              {errors.taskTypeId && <p className="error-text">{errors.taskTypeId}</p>}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="name">Task Name *</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} />
            {errors.name && <p className="error-text">{errors.name}</p>}
          </div>

          <div className="form-group">
            <label>Description</label>
            {/* THAY THẾ <textarea> BẰNG COMPONENT MỚI CỦA BẠN */}
            <RichTextEditor
              value={formData.description}
              onChange={handleDescriptionChange}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
                <label htmlFor="priorityId">Priority *</label>
                <select id="priorityId" name="priorityId" value={formData.priorityId} onChange={handleInputChange} disabled={!formData.projectId}>
                    <option value="">Select Priority</option>
                    {settings.priorities.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
                {errors.priorityId && <p className="error-text">{errors.priorityId}</p>}
            </div>
            <div className="form-group">
                <label htmlFor="dueDate">Due Date</label>
                <input type="date" id="dueDate" name="dueDate" value={formData.dueDate} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form-row">
             <div className="form-group">
                <label htmlFor="assigneeId">Assignee</label>
                <select id="assigneeId" name="assigneeId" value={formData.assigneeId} onChange={handleInputChange} disabled={!formData.projectId}>
                    <option value="">Unassigned</option>
                    {settings.members.map(m => <option key={m.userId._id} value={m.userId._id}>{m.userId.fullname}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>Reporter</label>
                <input type="text" value={user.fullname} disabled />
            </div>
          </div>

          <button type="button" className="show-more-btn" onClick={() => setShowMore(!showMore)}>
            {showMore ? 'Hide' : 'Show'} more fields
          </button>
          
          {showMore && (
            <div className="more-fields">
              <div className="form-group">
                <label htmlFor="storyPoints">Story Point</label>
                <input type="number" id="storyPoints" name="storyPoints" value={formData.storyPoints} onChange={handleInputChange} min="0" />
              </div>
              <div className="form-group">
                <label htmlFor="platformId">Platform</label>
                <select id="platformId" name="platformId" value={formData.platformId} onChange={handleInputChange} disabled={!formData.projectId}>
                    <option value="">Select Platform</option>
                    {settings.platforms.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <footer className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Save'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;