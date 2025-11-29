import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { updateTask, linkTask, unlinkTask, searchTasks, addAttachment, deleteAttachment, getAllowedStatuses } from "../../services/taskService";
import { getProjectMember } from "../../services/projectService";
import typeTaskService from "../../services/typeTaskService";
import priorityService from "../../services/priorityService";
import platformService from "../../services/platformService";
import sprintService from "../../services/sprintService";
import ActionsMenu from "../common/ActionsMenu";
import CommentsTab from "./CommentsTab";
import HistoryTab from "./HistoryTab";
import ConfirmationModal from "../common/ConfirmationModal";
import "../../styles/components/TaskDetailPanel.css";
import { IconComponent } from "../common/IconPicker";
import TaskDetailsTab from "./TaskDetailsTab";
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
  const [activeTab, setActiveTab] = useState("Details");
  const [allProjectTasks, setAllProjectTasks] = useState([]); // <<< STATE MỚI
  const nameTextAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isDeleteTaskModalOpen, setIsDeleteTaskModalOpen] = useState(false);
  const [isDeleteLinkModalOpen, setIsDeleteLinkModalOpen] = useState(false);
  const [isDeleteAttachmentModalOpen, setIsDeleteAttachmentModalOpen] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState(null);
  useEffect(() => {
    if (nameTextAreaRef.current) {
      nameTextAreaRef.current.style.height = "auto";
      nameTextAreaRef.current.style.height = `${nameTextAreaRef.current.scrollHeight}px`;
    }
  }, [editableTask?.name, task]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectTaskTypes, setProjectTaskTypes] = useState([]);
  const [projectPriorities, setProjectPriorities] = useState([]);
  const [projectPlatforms, setProjectPlatforms] = useState([]);
  const [projectSprints, setProjectSprints] = useState([]);
  const [allowedStatuses, setAllowedStatuses] = useState([]);

  useEffect(() => {
    setEditableTask(task);
    setProjectMembers([]);
    setProjectTaskTypes([]);
    setProjectPriorities([]);
    setProjectSprints([]);
    setProjectPlatforms([]);
    setAllowedStatuses([]); // Reset allowed statuses
    setAllProjectTasks([]); // Reset
    if (task && task.projectId && task.projectId.key) {
      const projectKey = task.projectId.key;
      const projectId = task.projectId._id;

      const fetchAllowedStatuses = async () => {
        try {
          const res = await getAllowedStatuses(task._id);
          setAllowedStatuses(res.data);
        } catch (error) {
          console.error("Failed to fetch allowed statuses", error);
          setAllowedStatuses(statuses);
        }
      };

      const fetchTaskTypesForProject = async () => {
        try {
          const res = await typeTaskService.getAllTypeTask(projectKey);
          const formattedTypes = res.data.map((t) => ({ value: t._id, label: t.name }));
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
          const formattedPriorities = res.data.map((p) => ({ value: p._id, label: p.name }));
          setProjectPriorities(formattedPriorities);
        } catch (error) {
          toast.error(`Could not load priorities for project ${projectKey}.`);
          setProjectPriorities([]);
        }
      };

      const fetchPlatformsForProject = async () => {
        try {
          const res = await platformService.getAllPlatforms(projectKey);
          const formattedPlatforms = res.data.map((p) => ({ value: p._id, label: p.name }));
          setProjectPlatforms(formattedPlatforms);
        } catch (error) {
          toast.error(`Could not load platforms for project ${projectKey}.`);
          setProjectPlatforms([]);
        }
      };
      const fetchSprintsForProject = async () => {
        try {
          const responseData = await sprintService.getSprints(projectKey);
          const allSprints = responseData.sprint || [];
          const activeSprints = allSprints.filter((sprint) => sprint.status === "Not Started" || sprint.status === "Started");
          const currentSprintId = task.sprintId?._id || task.sprintId;
          if (currentSprintId) {
            const isInActiveList = activeSprints.some((s) => s._id === currentSprintId);
            if (!isInActiveList) {
              const completedSprint = allSprints.find((s) => s._id === currentSprintId);
              if (completedSprint) {
                activeSprints.push(completedSprint);
              }
            }
          }
          const formattedSprints = activeSprints.map((s) => ({ value: s._id, label: s.name }));
          setProjectSprints(formattedSprints);
        } catch (error) {
          toast.error(`Could not load sprints for project ${projectKey}.`);
          setProjectSprints([]);
        }
      };
      const fetchAllTasksInProject = async () => {
        try {
          const response = await searchTasks({ projectId: projectId });

          setAllProjectTasks(response.data);
        } catch (error) {
          toast.error("Could not load tasks for linking.");
          setAllProjectTasks([]);
        }
      };

      Promise.all([
        fetchAllowedStatuses(),
        fetchTaskTypesForProject(),
        fetchMembers(),
        fetchPrioritiesForProject(),
        fetchPlatformsForProject(),
        fetchSprintsForProject(),
        fetchAllTasksInProject(),
      ]);
    }
  }, [task]);

  if (!editableTask) return null;

  const handleUpdate = async (fieldName, value) => {
    const updateValue = value === "" ? null : value;
    const projectKey = editableTask?.projectId?.key;
    const taskId = editableTask?._id;
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
      const res = await updateTask(projectKey, taskId, { [fieldName]: updateValue });
      onTaskUpdate(res.data);
      if (fieldName !== "name") {
        toast.success(`${fieldName.replace(/([A-Z])/g, " $1")} updated successfully!`);
      }
    } catch (error) {
      toast.error("Update failed. Reverting changes.");
      setEditableTask(originalTask); // Hoàn tác nếu lỗi
    }
  };

  const handleLinkTask = async (targetTaskId, linkType) => {
    try {
      const updatedTasks = await linkTask(editableTask._id, targetTaskId, linkType);

      onTaskUpdate(updatedTasks);

      setEditableTask(updatedTasks[0]); // Task đầu tiên luôn là task hiện tại

      toast.success("Task linked successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to link task.");
      throw error;
    }
  };

  const handleUnlinkTask = async () => {
    try {
      const updatedTasks = await unlinkTask(editableTask._id, selectedLinkId);

      onTaskUpdate(updatedTasks);

      setEditableTask(updatedTasks[0]);

      toast.success("Link removed successfully!");
      setIsDeleteLinkModalOpen(false);
      setSelectedLinkId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove link.");
    }
  };
  const handleDelete = () => {
    onTaskDelete(editableTask._id);
    setIsDeleteTaskModalOpen(false);
  };

  const handleClone = () => {
    onTaskClone(editableTask._id);
    toast.info("Clone function not implemented yet.");
  };
  const handleAddAttachment = () => {
    fileInputRef.current.click();
  };

  // 2. THÊM HÀM MỚI: Xử lý khi người dùng đã chọn file
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    toast.info("Uploading attachment...");

    try {
      // Gọi API để tải file lên
      const updatedTaskWithAttachment = await addAttachment(editableTask._id, file);

      // Cập nhật state để giao diện hiển thị file mới ngay lập tức
      setEditableTask(updatedTaskWithAttachment);
      onTaskUpdate(updatedTaskWithAttachment); // Thông báo cho component cha

      toast.success("Attachment added successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add attachment.");
    } finally {
      // Reset input để có thể chọn lại cùng một file
      event.target.value = null;
    }
  };

  const handleDeleteAttachment = async () => {
    try {
      const updatedTaskAfterDelete = await deleteAttachment(editableTask._id, selectedAttachmentId);

      setEditableTask(updatedTaskAfterDelete);
      onTaskUpdate(updatedTaskAfterDelete);

      toast.success("Attachment deleted successfully!");
      setIsDeleteAttachmentModalOpen(false);
      setSelectedAttachmentId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete attachment.");
    }
  };

  const typeIconInfo = PREDEFINED_TASKTYPE_ICONS.find((i) => i.name === editableTask.taskTypeId?.icon);

  return (
    <div className="task-detail-panel">
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: "none" }} />
      <header className="panel-header">
        <div className="panel-header-left">
          <div className="task-key-container">
            {typeIconInfo && (
              <span className="icon-wrapper-list-small" style={{ backgroundColor: typeIconInfo.color }} title={editableTask.taskTypeId.name}>
                <IconComponent name={editableTask.taskTypeId.icon} />
              </span>
            )}
            <a href={`/task/${editableTask.key}`} target="_blank" rel="noopener noreferrer" className="task-key-text">
              {editableTask.key}
            </a>
          </div>

          <div className="editable-task-name-wrapper" data-replicated-value={editableTask.name}>
            <textarea
              className="editable-task-name"
              value={editableTask.name}
              onChange={(e) => setEditableTask((prev) => ({ ...prev, name: e.target.value }))}
              onBlur={() => handleUpdate("name", editableTask.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
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
          <ActionsMenu onDelete={() => setIsDeleteTaskModalOpen(true)} onClone={handleClone} onAddAttachment={handleAddAttachment} />
          <button onClick={onClose} className="close-btn">
            &times;
          </button>
        </div>
      </header>
      <main className="panel-body">
        <div className="panel-tabs">
          <button className={`tab-btn ${activeTab === "Details" ? "active" : ""}`} onClick={() => setActiveTab("Details")}>
            Details
          </button>
          <button className={`tab-btn ${activeTab === "Comments" ? "active" : ""}`} onClick={() => setActiveTab("Comments")}>
            Comments
          </button>
          <button className={`tab-btn ${activeTab === "History" ? "active" : ""}`} onClick={() => setActiveTab("History")}>
            History
          </button>
        </div>

        <div className="panel-tab-content">
          {activeTab === "Details" && (
            <TaskDetailsTab
              editableTask={editableTask}
              setEditableTask={setEditableTask}
              handleUpdate={handleUpdate}
              statuses={allowedStatuses.length > 0 ? allowedStatuses : statuses}
              projectMembers={projectMembers}
              projectTaskTypes={projectTaskTypes}
              projectPriorities={projectPriorities}
              projectPlatforms={projectPlatforms}
              projectSprints={projectSprints}
              allProjectTasks={allProjectTasks}
              onLinkTask={handleLinkTask}
              onUnlinkTask={(linkId) => {
                setSelectedLinkId(linkId);
                setIsDeleteLinkModalOpen(true);
              }}
              onAddAttachment={handleAddAttachment}
              onDeleteAttachment={(attachmentId) => {
                setSelectedAttachmentId(attachmentId);
                setIsDeleteAttachmentModalOpen(true);
              }}
            />
          )}
          {activeTab === "Comments" && <CommentsTab taskId={editableTask._id} />}
          {activeTab === "History" && <HistoryTab taskId={editableTask._id} />}
        </div>
      </main>

      <ConfirmationModal
        isOpen={isDeleteTaskModalOpen}
        onClose={() => setIsDeleteTaskModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to delete task ${editableTask.key}? This action cannot be undone.`}
      />

      <ConfirmationModal
        isOpen={isDeleteLinkModalOpen}
        onClose={() => {
          setIsDeleteLinkModalOpen(false);
          setSelectedLinkId(null);
        }}
        onConfirm={handleUnlinkTask}
        title="Remove Link"
        message="Are you sure you want to remove this link? This action cannot be undone."
      />

      <ConfirmationModal
        isOpen={isDeleteAttachmentModalOpen}
        onClose={() => {
          setIsDeleteAttachmentModalOpen(false);
          setSelectedAttachmentId(null);
        }}
        onConfirm={handleDeleteAttachment}
        title="Delete Attachment"
        message="Are you sure you want to delete this attachment? This action cannot be undone."
      />
    </div>
  );
};

export default TaskDetailPanel;
