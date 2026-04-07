import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Button from "../ui/Button";
import Input from "../ui/Input";

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
        <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200">
          <h3 className="text-xl font-bold text-neutral-900">Edit Sprint</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Input label="Name" name="name" value={form.name} onChange={handleChange} required />
          <div>
            <label className="block text-sm font-semibold text-neutral-900 mb-2">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows="3"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" name="startDate" value={form.startDate} onChange={handleChange} />
            <Input label="End Date" type="date" name="endDate" value={form.endDate} onChange={handleChange} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SprintEditModal;
