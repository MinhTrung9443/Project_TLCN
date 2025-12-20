import React, { useState } from "react";
import Select from "react-select";
import "../../styles/pages/AddMemberModal.css";

const AddMemberModal = ({ isOpen, onClose, onAdd, users }) => {
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  const handleAddClick = () => {
    onAdd(selectedUserIds);
    setSelectedUserIds([]);
  };

  const userOptions = users
    .filter((user) => user.role !== "admin") // Lọc bỏ admin
    .map((user) => ({
      value: user._id,
      label: `${user.fullName || user.fullname} (${user.email})`,
      userData: user,
    }));

  const formatOptionLabel = ({ label, userData }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {userData?.avatar ? (
        <img
          src={userData.avatar}
          alt={userData.fullName || userData.fullname}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          {(userData?.fullName || userData?.fullname || "U").charAt(0).toUpperCase()}
        </div>
      )}
      <span>{label}</span>
    </div>
  );

  if (!isOpen) {
    return null;
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-header">Add Members</h2>
        <p>Members</p>
        <Select
          value={userOptions.filter((opt) => selectedUserIds.includes(opt.value))}
          onChange={(options) => setSelectedUserIds(options ? options.map((opt) => opt.value) : [])}
          options={userOptions}
          formatOptionLabel={formatOptionLabel}
          placeholder="Select members"
          isMulti
          isClearable
          menuPlacement="auto"
          menuPortalTarget={document.body}
          styles={{
            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
          }}
        />

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
