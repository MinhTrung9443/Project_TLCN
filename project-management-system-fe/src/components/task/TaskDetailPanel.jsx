import React, { useState, useEffect, useRef  } from "react";
import { toast } from "react-toastify";
import { updateTask } from "../../services/taskService";
import { getProjectMember } from "../../services/projectService";
import typeTaskService from "../../services/typeTaskService";
import priorityService from "../../services/priorityService";
import sprintService from "../../services/sprintService";
import ActionsMenu from "../common/ActionsMenu";
import TaskDetailsTab from './TaskDetailsTab'; 
import CommentsTab from './CommentsTab';       
import HistoryTab from './HistoryTab';         
import "../../styles/components/TaskDetailPanel.css";
import { IconComponent } from "../common/IconPicker"; 
const PREDEFINED_TASKTYPE_ICONS = [
  { name: "FaTasks", color: "#4BADE8" },
  { name: "FaStar", color: "#2ECC71" },
  { name: "FaCheckSquare", color: "#5297FF" },
  { name: "FaRegWindowMaximize", color: "#00A8A2" },
  { name: "FaBug", color: "#E44D42" },
  { name: "FaArrowUp", color: "#F57C00" },
  { name: "FaBullseye", color: "#654DF7" },
  { name: "FaQuestionCircle", color: "#7A869A" },
  { name: "FaRegClone", color: "#4BADE8" },
  { name: "FaEquals", color: "#DE350B" },
  { name: "FaFileAlt", color: "#00B8D9" },
];


const TaskDetailPanel = ({ task, onTaskUpdate, onClose, onTaskDelete, onTaskClone, statuses = [] }) => {
  const [editableTask, setEditableTask] = useState(task);
  const [activeTab, setActiveTab] = useState('Details');

  const nameTextAreaRef = useRef(null);
  useEffect(() => {
    if (nameTextAreaRef.current) {
      nameTextAreaRef.current.style.height = "auto";
      nameTextAreaRef.current.style.height = `${nameTextAreaRef.current.scrollHeight}px`;
    }
  }, [editableTask?.name, task]); 
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
    const updatedTask = { ...editableTask, [fieldName]: updateValue };
    setEditableTask(updatedTask); // Cập nhật state ngay lập tức

    try {
      const res = await updateTask(editableTask._id, { [fieldName]: updateValue });
      onTaskUpdate(res.data);
      if (fieldName !== 'name') {
        toast.success(`${fieldName.replace(/([A-Z])/g, " $1")} updated successfully!`);
      }
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

  const typeIconInfo = PREDEFINED_TASKTYPE_ICONS.find(
    i => i.name === editableTask.taskTypeId?.icon
  );

    return (
    <div className="task-detail-panel">
      <header className="panel-header">
        <div className="panel-header-left">
          <div className="task-key-container">
            {typeIconInfo && (
              <span 
                className="icon-wrapper-list-small" 
                style={{ backgroundColor: typeIconInfo.color }} 
                title={editableTask.taskTypeId.name}
              >
                <IconComponent name={editableTask.taskTypeId.icon} />
              </span>
            )}
            <span className="task-key-text">{editableTask.key}</span>
          </div>

          <div className="editable-task-name-wrapper" data-replicated-value={editableTask.name}>
                        <textarea
                            className="editable-task-name"
                            value={editableTask.name}
                            onChange={(e) => setEditableTask(prev => ({ ...prev, name: e.target.value }))}
                            onBlur={() => handleUpdate("name", editableTask.name)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    e.target.blur();
                                }
                            }}
                            rows="1"
                            spellCheck="false"
                            placeholder="Enter a task name..."
                        />
                    </div>
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