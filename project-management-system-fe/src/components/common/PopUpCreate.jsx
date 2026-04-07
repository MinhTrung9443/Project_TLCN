import React, { useState, useEffect } from "react";

const ICONS = ["task", "star", "bolt", "check_circle", "calendar_month", "bug_report"];

const PopUpCreate = ({ open, onClose, onSubmit, title = "Create Item", initialData = null, isPri = false }) => {
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
          : { name: "", description: "", icon: ICONS[0] },
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-neutral-900 mb-6">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-neutral-900 mb-2">Name</label>
            <input
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Enter name"
            />
          </div>
          {isPri ? null : (
            <div>
              <label className="block text-sm font-semibold text-neutral-900 mb-2">Description</label>
              <textarea
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                placeholder="Enter description"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-neutral-900 mb-3">Icon</label>
            <div className="flex flex-wrap gap-3">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all ${
                    form.icon === icon
                      ? "border-primary-600 bg-primary-50 text-primary-600"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                  onClick={() => handleIconSelect(icon)}
                  title={icon}
                >
                  <span className="material-symbols-outlined text-lg">{icon}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              {title.includes("Edit") ? "Save" : "Create"}
            </button>
            <button
              type="button"
              className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
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
