import React, { useState, useEffect } from "react";
import "../../styles/Setting/PopUpCreate.css";

const ICONS = [
  "task",
  "star",
  "bolt",
  "check_circle",
  "calendar_month",
  "bug_report",
];

const PopUpCreate = ({
  open,
  onClose,
  onSubmit,
  title = "Create Item",
  initialData = null,
}) => {
  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: ICONS[0],
  });

  // Khi popup mở hoặc initialData thay đổi, cập nhật form
  useEffect(() => {
    if (open) {
      setForm(
        initialData
          ? {
              name: initialData.name || "",
              description: initialData.description || "",
              icon: initialData.icon || ICONS[0],
            }
          : { name: "", description: "", icon: ICONS[0] }
      );
    }
  }, [open, initialData]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleIconSelect = (icon) => {
    setForm({ ...form, icon });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  if (!open) return null;
  return (
    <div className="popup-create-overlay" onClick={onClose}>
      <div
        className="popup-create-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="popup-create-title">{title}</h3>
        <form onSubmit={handleSubmit}>
          <div className="popup-create-form-group">
            <label className="popup-create-label">Name</label>
            <input
              className="popup-create-input"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Enter name"
            />
          </div>
          <div className="popup-create-form-group">
            <label className="popup-create-label">Description</label>
            <textarea
              className="popup-create-textarea"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              placeholder="Enter description"
            />
          </div>
          <div className="popup-create-form-group">
            <label className="popup-create-label">Icon</label>
            <div className="popup-create-icon-list">
              {ICONS.map((icon) => (
                <div
                  key={icon}
                  className={`popup-create-icon-item${
                    form.icon === icon ? " selected" : ""
                  }`}
                  onClick={() => handleIconSelect(icon)}
                  title={icon}
                >
                  <span className="material-symbols-outlined">{icon}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="popup-create-actions">
            <button type="submit" className="popup-create-btn-primary">
              {title.includes("Edit") ? "Save" : "Create"}
            </button>
            <button
              type="button"
              className="popup-create-btn"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PopUpCreate;
