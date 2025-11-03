import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Select from "react-select";
import { updateTask } from "../../services/taskService";
import { getProjectMember } from "../../services/projectService";
import typeTaskService from "../../services/typeTaskService";
import priorityService from "../../services/priorityService";
import sprintService from "../../services/sprintService";
import RichTextEditor from "../common/RichTextEditor";
import "../../styles/components/TaskDetailPanel.css";
import ActionsMenu from "../common/ActionsMenu";

const TaskDetailPanel = ({
  task,
  onTaskUpdate,
  onClose,
  onTaskDelete,
  onTaskClone,
  statuses = [], 
}) => {
  const [editableTask, setEditableTask] = useState(task);
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectTaskTypes, setProjectTaskTypes] = useState([]);
  const [projectPriorities, setProjectPriorities] = useState([]);
  const [projectSprints, setProjectSprints] = useState([]);
  useEffect(() => {
    setEditableTask(task);
    setProjectMembers([]);
    setProjectTaskTypes([]);
    setProjectPriorities([]);
    setProjectSprints([]);
    if (task && task.projectId && task.projectId.key) {
      const projectKey = task.projectId.key;

      const fetchTaskTypesForProject = async () => {
        try {
          const res = await typeTaskService.getAllTypeTask(projectKey);
          const formattedTypes = res.data.map(t => ({ value: t._id, label: t.name }));
          setProjectTaskTypes(formattedTypes);
        } catch (error) {
          toast.error(`Could not load task types for project ${projectKey}.`);
          setProjectTaskTypes([]);
        }
      };

      const fetchMembers = async () => {
        try {
          const res = await getProjectMember(projectKey);
          const memberOptions = res.data.members.map((member) => ({
            value: member.userId._id,
            label: member.userId.fullname,
          }));
          setProjectMembers(memberOptions);
        } catch (error) {
          toast.error(`Could not load project members.`);
          setProjectMembers([]);
        }
      };

      const fetchPrioritiesForProject = async () => {
        try {
          // Chỉ cần thay đổi tên hàm ở đây
          const res = await priorityService.getAllPriorities(projectKey);
          const formattedPriorities = res.data.map(p => ({ value: p._id, label: p.name }));
          setProjectPriorities(formattedPriorities);
        } catch (error) {
          toast.error(`Could not load priorities for project ${projectKey}.`);
          setProjectPriorities([]);
        }
      };

      const fetchSprintsForProject = async () => {
        try {
          const responseData = await sprintService.getSprints(projectKey);

          const allSprints = responseData.sprint || [];

          const activeSprints = allSprints.filter(
            sprint => sprint.status === 'Not Started' || sprint.status === 'Started'
          );

          const currentSprintId = task.sprintId?._id || task.sprintId;
          if (currentSprintId) {
            const isInActiveList = activeSprints.some(s => s._id === currentSprintId);
            if (!isInActiveList) {
              // Tìm sprint đã completed trong danh sách gốc và thêm vào
              const completedSprint = allSprints.find(s => s._id === currentSprintId);
              if (completedSprint) {
                activeSprints.push(completedSprint);
              }
            }
          }

          const formattedSprints = activeSprints.map(s => ({ value: s._id, label: s.name }));
          setProjectSprints(formattedSprints);
        } catch (error) {
          toast.error(`Could not load sprints for project ${projectKey}.`);
          setProjectSprints([]);
        }
      };

      Promise.all([
        fetchTaskTypesForProject(),
        fetchMembers(),
        fetchPrioritiesForProject(),
        fetchSprintsForProject(),
      ]);

    }
  }, [task]);

  if (!editableTask) return null;

  const handleUpdate = async (fieldName, value) => {
    const updateValue = value === "" ? null : value;

    const newStartDate = fieldName === "startDate" ? updateValue : editableTask.startDate;
    const newDueDate = fieldName === "dueDate" ? updateValue : editableTask.dueDate;

    if (newStartDate && newDueDate && new Date(newStartDate) > new Date(newDueDate)) {
      toast.error("Start Date cannot be after Due Date.");
      return;
    }

    const originalTask = { ...editableTask };

    setEditableTask((prev) => ({ ...prev, [fieldName]: updateValue }));

    try {
      const res = await updateTask(editableTask._id, { [fieldName]: updateValue });
      onTaskUpdate(res.data);
      toast.success(`${fieldName.replace(/([A-Z])/g, " $1")} updated successfully!`);
    } catch (error) {
      toast.error("Update failed. Reverting changes.");
      setEditableTask(originalTask); // Hoàn tác nếu lỗi
    }
  };

  const handleDescriptionUpdate = (content) => {
    handleUpdate("description", content);
  };

  const findOption = (options, field) => {
    if (!field) return null;
    const idToFind = typeof field === "object" ? field._id : field;
    return options.find((opt) => opt.value === idToFind);
  };
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete task ${editableTask.key}?`)) {
      onTaskDelete(editableTask._id);
    }
  };

  const handleClone = () => {
    onTaskClone(editableTask._id);
    toast.info("Clone function not implemented yet.");
  };

  const handleAddAttachment = () => {
    toast.info("Add attachment function not implemented yet.");
  };

  return (
    <div className="task-detail-panel">
      <header className="panel-header">
        <div className="panel-header-left">
          <h3>
            {editableTask.key}: {editableTask.name}
          </h3>
        </div>
        <div className="panel-header-right">
          <ActionsMenu onDelete={handleDelete} onClone={handleClone} onAddAttachment={handleAddAttachment} />
          <button onClick={onClose} className="close-btn">
            &times;
          </button>
        </div>
      </header>
      <main className="panel-body">
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
              placeholder={!task ? "" : (projectSprints.length === 0 && task.projectId) ? "Loading..." : "Backlog"}
            />
          </div>
          <div className="detail-item-editable">
            <strong>Story Point</strong>
            <input
              type="number"
              value={editableTask.storyPoints || ""}
              onChange={(e) => setEditableTask((prev) => ({ ...prev, storyPoints: e.target.value }))}
              onBlur={(e) => handleUpdate("storyPoints", parseInt(e.target.value, 10) || 0)}
              className="editable-input"
              min="0"
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

        <div className="panel-section">
          <h4>Description</h4>
          <RichTextEditor value={editableTask.description || ""} onChange={handleDescriptionUpdate} />
        </div>

        <footer className="panel-footer">
          <span>Created By: {editableTask.createdById?.fullname || "N/A"}</span>
        </footer>
      </main>
    </div>
  );
};

export default TaskDetailPanel;
