import React from 'react';
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";

export const IconComponent = ({ name }) => {
  const AllIcons = { ...FaIcons, ...VscIcons };
  const Icon = AllIcons[name];
  if (!Icon) return <FaIcons.FaQuestionCircle />; // Icon mặc định nếu không tìm thấy
  return <Icon />;
};

export const IconPicker = ({ icons, selectedIcon, onSelect }) => (
  <div className="icon-picker-container">
    {icons.map((icon) => (
      <button
        key={icon.name}
        type="button"
        className={`icon-picker-button ${selectedIcon === icon.name ? "selected" : ""}`}
        onClick={() => onSelect(icon.name)}
      >
        <div className="icon-display" style={{ backgroundColor: icon.color }}>
          <IconComponent name={icon.name} />
        </div>
      </button>
    ))}
  </div>
);