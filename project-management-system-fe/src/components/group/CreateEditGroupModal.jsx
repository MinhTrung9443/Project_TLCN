// In: src/components/group/CreateEditGroupModal.jsx
import React, { useState, useEffect } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";

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
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-900">{group ? "Edit Group" : "Create Group"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <Input label="Name" id="group-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />

          <div>
            <label htmlFor="group-description" className="block text-sm font-semibold text-neutral-900 mb-2">
              Description
            </label>
            <textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-neutral-900">Active</label>
            <label className="relative inline-block w-14 h-8">
              <input
                type="checkbox"
                checked={status === "active"}
                onChange={(e) => setStatus(e.target.checked ? "active" : "inactive")}
                className="sr-only peer"
              />
              <span className="absolute inset-0 bg-neutral-300 rounded-full transition-colors peer-checked:bg-primary-600 cursor-pointer"></span>
              <span className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-6 shadow-md"></span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-200">
            <Button type="button" onClick={onClose} variant="secondary">
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

export default CreateEditGroupModal;
