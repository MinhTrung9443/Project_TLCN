// In: src/components/group/CreateEditGroupModal.jsx
import React, { useState, useEffect } from "react";

const CreateEditGroupModal = ({ isOpen, onClose, onSave, group }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");

  useEffect(() => {
    if (isOpen) {
      if (group) {
        setName(group.name || "");
        setDescription(group.description || "");
        setStatus(group.status || "active");
      } else {
        setName("");
        setDescription("");
        setStatus("active");
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{group ? "Edit Group" : "Create Group"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="group-name" className="block text-sm font-semibold text-gray-900 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="group-description" className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-900">Active</label>
            <label className="relative inline-block w-14 h-8">
              <input
                type="checkbox"
                checked={status === "active"}
                onChange={(e) => setStatus(e.target.checked ? "active" : "inactive")}
                className="sr-only peer"
              />
              <span className="absolute inset-0 bg-gray-300 rounded-full transition-colors peer-checked:bg-purple-600 cursor-pointer"></span>
              <span className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-6 shadow-md"></span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditGroupModal;
