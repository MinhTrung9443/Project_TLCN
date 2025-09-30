import React, { useState, useEffect } from "react";
import "../../styles/pages/ManageSprint/SprintEditModal.css";

const SprintEditModal = ({ isOpen, sprint, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: sprint?.name || "",
    description: sprint?.description || "",
    startDate: sprint?.startDate ? new Date(sprint.startDate).toISOString().slice(0, 10) : "",
    endDate: sprint?.endDate ? new Date(sprint.endDate).toISOString().slice(0, 10) : "",
  });

  useEffect(() => {
    setForm({
      name: sprint?.name || "",
      description: sprint?.description || "",
      startDate: sprint?.startDate ? new Date(sprint.startDate).toISOString().slice(0, 10) : "",
      endDate: sprint?.endDate ? new Date(sprint.endDate).toISOString().slice(0, 10) : "",
    });
  }, [sprint]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content sprint-edit-modal">
        <div className="modal-header-container">
          <h3 className="modal-title">Edit Sprint</h3>
          <button onClick={onClose} className="modal-close-button">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="sprint-edit-form">
          <label>
            Name
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            Description
            <textarea name="description" value={form.description} onChange={handleChange} />
          </label>
          <div className="sprint-edit-dates">
            <label>
              Start Date
              <input type="date" name="startDate" value={form.startDate} onChange={handleChange} />
            </label>
            <label>
              End Date
              <input type="date" name="endDate" value={form.endDate} onChange={handleChange} />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="confirm-button">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SprintEditModal;
