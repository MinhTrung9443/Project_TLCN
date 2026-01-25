import React, { useState } from "react";
import Select from "react-select";

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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add Members</h2>
        </div>
        <div className="p-6 space-y-4">
          <label className="block text-sm font-semibold text-gray-900 mb-2">Members</label>
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
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddClick}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            Add Members
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
