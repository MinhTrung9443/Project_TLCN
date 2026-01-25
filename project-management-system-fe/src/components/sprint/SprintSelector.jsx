import React, { useState } from "react";

// Sprint Selector Dropdown Component
const SprintSelector = ({ currentSprint, availableSprints, onSprintChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent min-w-[200px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium text-gray-900">{currentSprint?.name || "Select Sprint"}</span>
        <span className="material-symbols-outlined text-gray-600">{isOpen ? "expand_less" : "expand_more"}</span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {availableSprints.map((sprint) => (
            <div
              key={sprint._id}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${currentSprint?._id === sprint._id ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700"}`}
              onClick={() => {
                onSprintChange(sprint);
                setIsOpen(false);
              }}
            >
              {sprint.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SprintSelector;
