import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
// import các service...
import { updateTask } from "../../services/taskService";
import { getProjectMember } from "../../services/projectService";
import typeTaskService from "../../services/typeTaskService";
import priorityService from "../../services/priorityService";
import sprintService from "../../services/sprintService";
// import các component con
import ActionsMenu from "../common/ActionsMenu";
import TaskDetailsTab from './TaskDetailsTab'; // COMPONENT MỚI SẼ TẠO
import CommentsTab from './CommentsTab';       // COMPONENT TỪ LẦN TRƯỚC
import HistoryTab from './HistoryTab';         // COMPONENT TỪ LẦN TRƯỚC
// import CSS
import "../../styles/components/TaskDetailPanel.css";

const TaskDetailPanel = ({ task, onTaskUpdate, onClose, onTaskDelete, onTaskClone, statuses = [] }) => {
  const [editableTask, setEditableTask] = useState(task);
  const [activeTab, setActiveTab] = useState('Details'); // State quản lý tab

  // State cho các dropdown options
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectTaskTypes, setProjectTaskTypes] = useState([]);
  const [projectPriorities, setProjectPriorities] = useState([]);
  const [projectSprints, setProjectSprints] = useState([]);
  
  // ----- Toàn bộ logic trong useEffect để fetch data vẫn giữ nguyên -----
  useEffect(() => {
    setEditableTask(task);
    // Reset state khi task thay đổi
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
        <div className="panel-tabs">
          <button 
            className={`tab-btn ${activeTab === 'Details' ? 'active' : ''}`}
            onClick={() => setActiveTab('Details')}
          >
            Details
          </button>
          <button 
            className={`tab-btn ${activeTab === 'Comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('Comments')}
          >
            Comments
          </button>
          <button 
            className={`tab-btn ${activeTab === 'History' ? 'active' : ''}`}
            onClick={() => setActiveTab('History')}
          >
            History
          </button>
        </div>

        <div className="panel-tab-content">
          {activeTab === 'Details' && (
            <TaskDetailsTab
              editableTask={editableTask}
              setEditableTask={setEditableTask}
              handleUpdate={handleUpdate}
              statuses={statuses}
              projectMembers={projectMembers}
              projectTaskTypes={projectTaskTypes}
              projectPriorities={projectPriorities}
              projectSprints={projectSprints}
            />
          )}
          {activeTab === 'Comments' && <CommentsTab taskId={editableTask._id} />}
          {activeTab === 'History' && <HistoryTab taskId={editableTask._id} />}
        </div>
      </main>
    </div>
  );
};

export default TaskDetailPanel;