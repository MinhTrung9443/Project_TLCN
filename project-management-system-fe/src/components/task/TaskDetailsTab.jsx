
import React from "react";
import Select from "react-select";
import RichTextEditor from "../common/RichTextEditor";
import AttachmentsTab from './AttachmentsTab'; 
import LinkedTasksTab from './LinkedTasksTab'; 

const TaskDetailsTab = ({
  editableTask,
  setEditableTask,
  handleUpdate,
  statuses,
  projectMembers,
  projectTaskTypes,
  projectPriorities,
  projectPlatforms,
  projectSprints,
  onAddAttachment,
  onDeleteAttachment,
  allProjectTasks, 
  onLinkTask,
  onUnlinkTask
}) => {

  const handleDescriptionUpdate = (content) => {
    handleUpdate("description", content);
  };

  const findOption = (options, field) => {
    if (!field) return null;
    const idToFind = typeof field === "object" ? field._id : field;
    return options.find((opt) => opt.value === idToFind);
  };
  
  return (
    <>
      <div className="panel-section">
        <div className="detail-item-editable">
          <strong>Progress</strong>
          <div className="progress-bar-container">
            <input
              type="range"
              min="0"
              max="100"
              value={editableTask.progress || 0}
              className="progress-slider"
              onChange={(e) => setEditableTask((prev) => ({ ...prev, progress: parseInt(e.target.value, 10) }))}
              onMouseUp={(e) => handleUpdate("progress", parseInt(e.target.value, 10))}
            />
            <span>{editableTask.progress || 0}%</span>
          </div>
        </div>
      </div>

      <div className="panel-section detail-grid-editable">
          <div className="detail-item-editable">
            <strong>Status</strong>
            <Select
              value={findOption(statuses, editableTask.statusId?._id)}
              options={statuses}
              onChange={(option) => handleUpdate("statusId", option.value)}
            />
          </div>
          <div className="detail-item-editable">
            <strong>Assignee</strong>
            <Select
              value={findOption(projectMembers, editableTask.assigneeId)}
              options={projectMembers} // Sử dụng danh sách members
              onChange={(option) => handleUpdate("assigneeId", option ? option.value : null)}
              isClearable
              placeholder="Select..."
            />
          </div>
          <div className="detail-item-editable">
            <strong>Reporter</strong>
            <Select
              value={findOption(projectMembers, editableTask.reporterId)}
              options={projectMembers} // Sử dụng danh sách members
              onChange={(option) => handleUpdate("reporterId", option.value)}
              placeholder="Select..."
            />
          </div>
          <div className="detail-item-editable">
            <strong>Type</strong>
            <Select
              value={findOption(projectTaskTypes, editableTask.taskTypeId)}
              options={projectTaskTypes}
              onChange={(option) => handleUpdate("taskTypeId", option.value)}
              placeholder={projectTaskTypes.length === 0 ? "Loading..." : "Select..."}
            />
          </div>
          <div className="detail-item-editable">
            <strong>Priority</strong>
            <Select
              value={findOption(projectPriorities, editableTask.priorityId?._id)}
              options={projectPriorities}
              onChange={(option) => handleUpdate("priorityId", option.value)}
              placeholder={projectPriorities.length === 0 ? "Loading..." : "Select..."}
            />
          </div>
          <div className="detail-item-editable">
            <strong>Sprint</strong>
            <Select
              value={findOption(projectSprints, editableTask.sprintId?._id)}
              options={projectSprints}
              onChange={(option) => handleUpdate("sprintId", option ? option.value : null)}
              isClearable
              placeholder={!editableTask ? "" : (projectSprints.length === 0 && editableTask.projectId) ? "Loading..." : "Backlog"}
            />
          </div>
          <div className="detail-item-editable">
            <strong>Platform</strong>
            <Select
              value={findOption(projectPlatforms, editableTask.platformId?._id)}
              options={projectPlatforms}
              onChange={(option) => handleUpdate("platformId", option.value)}
              placeholder={projectPlatforms.length === 0 ? "Loading..." : "Select..."}
            />
          </div>
          <div className="detail-item-editable">
            <strong>Start Date</strong>
            <input
              type="date"
              value={editableTask.startDate ? new Date(editableTask.startDate).toISOString().split("T")[0] : ""}
              onChange={(e) => handleUpdate("startDate", e.target.value)}
              className="editable-input"
            />
          </div>
          <div className="detail-item-editable">
            <strong>Due Date</strong>
            <input
              type="date"
              value={editableTask.dueDate ? new Date(editableTask.dueDate).toISOString().split("T")[0] : ""}
              onChange={(e) => handleUpdate("dueDate", e.target.value)}
              className="editable-input"
            />
          </div>
        </div>

      {/* Description */}
      <div className="panel-section">
        <h4>Description</h4>
        <RichTextEditor value={editableTask.description || ""} onChange={handleDescriptionUpdate} />
      </div>
       <div className="panel-section">
        <LinkedTasksTab 
            task={editableTask}
            allProjectTasks={allProjectTasks}
            onLink={onLinkTask}
            onUnlink={onUnlinkTask}
        />
      </div>

      <div className="panel-section">
        <AttachmentsTab 
          attachments={editableTask.attachments} 
          onAdd={onAddAttachment} 
          onDelete={onDeleteAttachment} 
        />
      </div>

      <footer className="panel-footer">
        <span>Created By: {editableTask.createdById?.fullname || "N/A"}</span>
      </footer>
    </>
  );
};

export default TaskDetailsTab;