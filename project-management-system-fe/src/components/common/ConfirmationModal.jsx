import React from 'react';
import '../../styles/pages/ConfirmationModal.css';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Yes',
    cancelText = 'No',
}) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header-container">
                    <h3 className="modal-title">{title}</h3>
                    <button onClick={onClose} className="modal-close-button">&times;</button>
                </div>

                <p className="modal-message">{message}</p>

                <div className="modal-actions">
                    <button
                        onClick={onClose}
                        className="cancel-button"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="confirm-button"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;