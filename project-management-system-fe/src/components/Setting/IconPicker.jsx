import React from "react";
import "../../styles/Setting/IconPicker.css";

const IconPicker = ({ icons, selectedIcon, onSelect }) => {
  if (!icons || icons.length === 0) return null;

  return (
    <div className="icon-picker-modern">
      {icons.map((icon) => (
        <button
          key={icon.name}
          type="button"
          className={`icon-option ${selectedIcon === icon.name ? "selected" : ""}`}
          onClick={() => onSelect(icon.name)}
          title={icon.name}
        >
          <div className="icon-badge" style={{ backgroundColor: icon.color }}>
            {icon.component}
          </div>
        </button>
      ))}
    </div>
  );
};

export default IconPicker;
