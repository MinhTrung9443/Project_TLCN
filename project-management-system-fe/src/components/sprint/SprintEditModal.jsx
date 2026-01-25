import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

const SprintEditModal = ({ isOpen, sprint, onClose, onSave, project }) => {
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

    // Validate dates - compare only dates, not time
    if (form.startDate && form.endDate) {
      const startDate = new Date(form.startDate);
      const endDate = new Date(form.endDate);

      // Set time to 00:00:00 for both dates to compare only dates
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      if (startDate > endDate) {
        toast.error("Start date cannot be after end date");
        return;
      }
    }

    // Validate sprint dates within project dates
    if (project && form.startDate) {
      const sprintStartDate = new Date(form.startDate);
      const projectStartDate = new Date(project.startDate);
      const projectEndDate = new Date(project.endDate);

      sprintStartDate.setHours(0, 0, 0, 0);
      projectStartDate.setHours(0, 0, 0, 0);
      projectEndDate.setHours(0, 0, 0, 0);

      if (sprintStartDate < projectStartDate || sprintStartDate > projectEndDate) {
        toast.error(`Sprint start date must be between ${projectStartDate.toLocaleDateString()} and ${projectEndDate.toLocaleDateString()}`);
        return;
      }
    }

    if (project && form.endDate) {
      const sprintEndDate = new Date(form.endDate);
      const projectStartDate = new Date(project.startDate);
      const projectEndDate = new Date(project.endDate);

      sprintEndDate.setHours(0, 0, 0, 0);
      projectStartDate.setHours(0, 0, 0, 0);
      projectEndDate.setHours(0, 0, 0, 0);

      if (sprintEndDate < projectStartDate || sprintEndDate > projectEndDate) {
        toast.error(`Sprint end date must be between ${projectStartDate.toLocaleDateString()} and ${projectEndDate.toLocaleDateString()}`);
        return;
      }
    }

    onSave({ ...form });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Edit Sprint</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-3xl font-light leading-none p-1 hover:bg-gray-100 rounded">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows="3"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">End Date</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SprintEditModal;
