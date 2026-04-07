import React from "react";
import Button from "../ui/Button";

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Yes", cancelText = "No" }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <p className="text-xs uppercase text-neutral-500">Confirmation</p>
            <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
          </div>
          <Button variant="ghost" size="sm" icon="close" onClick={onClose} />
        </div>

        <p className="px-6 py-5 text-neutral-700 leading-relaxed">{message}</p>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-xl">
          <Button variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant="danger" onClick={onConfirm} icon="delete">
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
