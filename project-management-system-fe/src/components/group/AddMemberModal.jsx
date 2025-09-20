import React, { useState } from 'react';
import '../../styles/pages/AddMemberModal.css';

const AddMemberModal = ({ isOpen, onClose, onAdd, users }) => {
    const [selectedUserId, setSelectedUserId] = useState('');

    const handleAddClick = () => {
        onAdd(selectedUserId);
        setSelectedUserId('');
    };

    if (!isOpen) {
        return null;
    }
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-header">Add Members</h2>
                <p>Employees</p>
                <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="user-select"
                >
                    <option value="">Select an employee</option>
                    {users.map(user => (
                        <option key={user._id} value={user._id}>
                            {user.fullName || user.fullname} ({user.email})
                        </option>
                    ))}
                </select>

                <div className="modal-actions">
                    <button type="button" onClick={onClose} className="cancel-button">
                        Cancel
                    </button>
                    <button onClick={handleAddClick} className="save-button">
                        Add Members
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMemberModal;