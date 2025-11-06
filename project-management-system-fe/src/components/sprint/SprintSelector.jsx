import React, { useState } from "react";

// Sprint Selector Dropdown Component
const SprintSelector = ({ currentSprint, availableSprints, onSprintChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="sprint-selector">
      <button className="sprint-selector-button" onClick={() => setIsOpen(!isOpen)}>
        <span className="sprint-name">{currentSprint?.name || "Select Sprint"}</span>
        <span className="material-symbols-outlined">{isOpen ? "expand_less" : "expand_more"}</span>
      </button>

      {isOpen && (
        <div className="sprint-dropdown">
          {availableSprints.map((sprint) => (
            <div
              key={sprint._id}
              className={`sprint-option ${currentSprint?._id === sprint._id ? "selected" : ""}`}
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
