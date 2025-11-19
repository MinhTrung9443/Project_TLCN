import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { cloneProject } from '../../services/projectService';
import { toast } from 'react-toastify';

const CloneProjectModal = ({ isOpen, onClose, sourceProject, onProjectCloned }) => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [key, setKey] = useState('');

    useEffect(() => {
        if (sourceProject) {
            setName(`CLONE ${sourceProject.name}`);
            setKey('');
        }
    }, [sourceProject]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!sourceProject) return;

        try {
            const cloneData = {
                name,
                key,
                projectManagerId: user._id,
            };
            const response = await cloneProject(sourceProject._id, cloneData);
            toast.success('Project cloned successfully!');
            onProjectCloned(response.data);
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to clone project.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <h2>Clone Project</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Project Name*</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Key*</label>
                        <input
                            type="text"
                            value={key}
                            onChange={(e) => setKey(e.target.value.toUpperCase())}
                            required
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">Clone</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CloneProjectModal;