import React from "react";
import * as FaIcons from "react-icons/fa";
import * as VscIcons from "react-icons/vsc";

export const IconComponent = ({ name }) => {
  const AllIcons = { ...FaIcons, ...VscIcons };
  const Icon = AllIcons[name];
  if (!Icon) return <FaIcons.FaQuestionCircle />;
  return <Icon />;
};

export const IconPicker = ({ icons, selectedIcon, onSelect }) => (
  <div className="flex flex-wrap gap-3">
    {icons.map((icon) => (
      <button
        key={icon.name}
        type="button"
        className={`p-3 rounded-lg border-2 transition-all ${
          selectedIcon === icon.name ? "border-purple-600 bg-purple-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
        onClick={() => onSelect(icon.name)}
      >
        <div className="w-8 h-8 flex items-center justify-center text-lg text-white rounded" style={{ backgroundColor: icon.color }}>
          <IconComponent name={icon.name} />
        </div>
      </button>
    ))}
  </div>
);
