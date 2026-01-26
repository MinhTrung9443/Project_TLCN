import React from "react";

const IconPicker = ({ icons, selectedIcon, onSelect }) => {
  if (!icons || icons.length === 0) return null;

  return (
    <div className="grid grid-cols-6 gap-2">
      {icons.map((icon) => (
        <button
          key={icon.name}
          type="button"
          className={`p-2 rounded-lg border-2 transition-all hover:scale-110 ${
            selectedIcon === icon.name ? "border-primary-600 bg-primary-50 shadow-md" : "border-neutral-200 hover:border-primary-300"
          }`}
          onClick={() => onSelect(icon.name)}
          title={icon.name}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: icon.color }}>
            {icon.component}
          </div>
        </button>
      ))}
    </div>
  );
};

export default IconPicker;
