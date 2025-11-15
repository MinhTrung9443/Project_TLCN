import React from "react";
import SprintItem from "./SprintItem";

export const SprintList = ({ sprintList, onDrop, onEdit, onStart, onComplete, onDelete, onSprintNameClick, projectType }) => (
  <>
    {sprintList &&
      sprintList.length > 0 &&
      sprintList.map((sprint) => (
        <SprintItem
          key={sprint._id}
          sprint={sprint}
          onDrop={onDrop}
          onEdit={onEdit}
          onStart={onStart}
          onComplete={onComplete}
          onDelete={onDelete}
          onSprintNameClick={onSprintNameClick}
          projectType={projectType}
        />
      ))}
  </>
);

export default SprintList;
