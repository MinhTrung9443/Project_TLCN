// In: src/components/group/CreateEditGroupModal.jsx
import React, { useState, useEffect } from 'react';
import '../../styles/pages/CreateEditGroupModal.css';

const CreateEditGroupModal = ({ isOpen, onClose, onSave, group }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (isOpen) {
      if (group) { 
        setName(group.name || '');
        setDescription(group.description || '');
        setStatus(group.status || 'active');
      } else { 
        setName('');
        setDescription('');
        setStatus('active');
      }
    }
  }, [group, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, description, status });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-header">{group ? 'Edit Group' : 'Create Group'}</h2>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="group-name">Name</label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="group-description">Description</label>
            <textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group-toggle">
            <label>Active</label>
            <label className="switch">
              <input
                type="checkbox"
                checked={status === 'active'}
                onChange={(e) => setStatus(e.target.checked ? 'active' : 'inactive')}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="save-button">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditGroupModal;