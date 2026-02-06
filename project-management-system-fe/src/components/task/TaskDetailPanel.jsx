import React, { useState, useEffect, useRef, useContext } from "react";
import { toast } from "react-toastify";
import {
  updateTask,
  linkTask,
  unlinkTask,
  searchTasks,
  addAttachment,
  addAttachmentFromDocument,
  deleteAttachment,
  getAllowedStatuses,
} from "../../services/taskService";
import { getProjectMember } from "../../services/projectService";
import { useAuth } from "../../contexts/AuthContext";
import { ProjectContext } from "../../contexts/ProjectContext";
import { getProjectDocuments } from "../../services/projectDocsService";
import typeTaskService from "../../services/typeTaskService";
import priorityService from "../../services/priorityService";
import platformService from "../../services/platformService";
import sprintService from "../../services/sprintService";
import ActionsMenu from "../common/ActionsMenu";
import CommentsTab from "./CommentsTab";
import HistoryTab from "./HistoryTab";
import ConfirmationModal from "../common/ConfirmationModal";
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

const statusCategoryStyles = {
  "To Do": "bg-neutral-100 text-neutral-700 border-neutral-200",
  "In Progress": "bg-primary-100 text-primary-700 border-primary-200",
  Done: "bg-success-100 text-success-700 border-success-200",
  default: "bg-neutral-100 text-neutral-700 border-neutral-200",
};

const TaskDetailPanel = ({ task, onTaskUpdate, onClose, onTaskDelete, statuses = [], showCloseButton = true, isCompact = false }) => {
  const { user } = useAuth();
  const { userProjectRole, selectedProjectKey } = useContext(ProjectContext);
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
  const [showAttachmentSourceModal, setShowAttachmentSourceModal] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [projectDocs, setProjectDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [docSearch, setDocSearch] = useState("");
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
    console.log("TaskDetailPanel - Received task:", task);
    console.log("TaskDetailPanel - task.assigneeId:", task?.assigneeId);
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
          console.log("TaskDetailPanel - Project members response:", res.data);

          const currentAssigneeId = task?.assigneeId?._id || task?.assigneeId;

          // Build a set of active user ids based on populated status fields
          const activeUserIds = new Set();
          (res.data.members || []).forEach((member) => {
            const uid = member.userId?._id || member.userId;
            if (member.userId && member.userId.status !== "inactive") activeUserIds.add(uid);
          });
          (res.data.teams || []).forEach((team) => {
            if (team.leaderId && team.leaderId.status !== "inactive") activeUserIds.add(team.leaderId._id || team.leaderId);
            (team.members || []).forEach((member) => {
              const mid = member._id || member;
              if (member && member.status !== "inactive") activeUserIds.add(mid);
            });
          });

          // Lấy members từ project.members (giữ lại nếu active hoặc là assignee hiện tại)
          const individualMembers = (res.data.members || []).reduce((acc, member) => {
            const uid = member.userId?._id || member.userId;
            if (!uid) return acc;
            if (activeUserIds.has(uid) || uid?.toString() === currentAssigneeId?.toString()) {
              acc.push({ value: uid, label: member.userId?.fullname || member.userId?.username || "Unknown" });
            }
            return acc;
          }, []);

          // Lấy team leaders và team members từ teams (giữ lại nếu active hoặc là assignee hiện tại)
          const teamMembers = [];
          if (res.data.teams && Array.isArray(res.data.teams)) {
            res.data.teams.forEach((team) => {
              if (team.leaderId) {
                const leaderId = team.leaderId._id || team.leaderId;
                const leaderName = team.leaderId.fullname || team.leaderId.username || "Unknown";
                if (!teamMembers.find((m) => m.value === leaderId) && !individualMembers.find((m) => m.value === leaderId)) {
                  if (activeUserIds.has(leaderId) || leaderId?.toString() === currentAssigneeId?.toString()) {
                    teamMembers.push({ value: leaderId, label: leaderName });
                  }
                }
              }
              if (team.members && Array.isArray(team.members)) {
                team.members.forEach((member) => {
                  const memberId = member._id || member;
                  const memberName = member.fullname || member.username || "Unknown";
                  if (!teamMembers.find((m) => m.value === memberId) && !individualMembers.find((m) => m.value === memberId)) {
                    if (activeUserIds.has(memberId) || memberId?.toString() === currentAssigneeId?.toString()) {
                      teamMembers.push({ value: memberId, label: memberName });
                    }
                  }
                });
              }
            });
          }

          // Combine all members
          let allMembers = [...individualMembers, ...teamMembers];

          // Filter based on user role if not admin
          if (user.role !== "admin") {
            // Check if user is PM in this project
            const isPM = res.data.members?.some(
              (member) => (member.userId._id === user._id || member.userId === user._id) && member.role === "PROJECT_MANAGER",
            );

            if (!isPM) {
              // User is a Leader - only show their team members + themselves
              const userLeadTeams = res.data.teams?.filter((team) => team.leaderId._id === user._id || team.leaderId === user._id) || [];

              // Get all team member IDs including the leader
              const allowedMemberIds = [user._id.toString()]; // Add leader themselves
              userLeadTeams.forEach((team) => {
                if (team.members && Array.isArray(team.members)) {
                  team.members.forEach((member) => {
                    const memberId = (member._id || member).toString();
                    if (!allowedMemberIds.includes(memberId)) {
                      allowedMemberIds.push(memberId);
                    }
                  });
                }
              });

              // Filter to only allowed members (or current assignee to prevent breaking existing assignments)
              allMembers = allMembers.filter(
                (m) => allowedMemberIds.includes(m.value.toString()) || m.value.toString() === currentAssigneeId?.toString(),
              );
            }
          }

          console.log("TaskDetailPanel - Formatted memberOptions:", allMembers);
          setProjectMembers(allMembers);
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
          const formattedSprints = activeSprints.map((s) => ({ value: s._id, label: s.name, startDate: s.startDate, endDate: s.endDate }));
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

  const handleUpdate = async (fieldName, value) => {
    const updateValue = value === "" ? null : value;
    const projectKey = editableTask?.projectId?.key;
    const taskId = editableTask?._id;
    const newStartDate = fieldName === "startDate" ? updateValue : editableTask.startDate;
    const newDueDate = fieldName === "dueDate" ? updateValue : editableTask.dueDate;

    // So sánh chỉ phần ngày, bỏ qua giờ
    if (newStartDate && newDueDate) {
      const startDateOnly = new Date(newStartDate).setHours(0, 0, 0, 0);
      const dueDateOnly = new Date(newDueDate).setHours(0, 0, 0, 0);

      if (startDateOnly > dueDateOnly) {
        toast.error("Start Date cannot be after Due Date.");
        return;
      }
    }

    // Validate sprint dates when changing sprintId
    if (fieldName === "sprintId" && updateValue && newStartDate && newDueDate) {
      const selectedSprint = projectSprints.find((s) => s.value === updateValue);
      if (selectedSprint && selectedSprint.startDate && selectedSprint.endDate) {
        const taskStart = new Date(newStartDate).setHours(0, 0, 0, 0);
        const taskEnd = new Date(newDueDate).setHours(0, 0, 0, 0);
        const sprintStart = new Date(selectedSprint.startDate).setHours(0, 0, 0, 0);
        const sprintEnd = new Date(selectedSprint.endDate).setHours(0, 0, 0, 0);

        if (taskStart < sprintStart || taskEnd > sprintEnd) {
          toast.error(
            `Task dates (${new Date(newStartDate).toLocaleDateString()} - ${new Date(
              newDueDate,
            ).toLocaleDateString()}) must be within sprint dates (${new Date(selectedSprint.startDate).toLocaleDateString()} - ${new Date(
              selectedSprint.endDate,
            ).toLocaleDateString()})`,
          );
          return;
        }
      }
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
      const errorMessage = error.response?.data?.message || "Update failed. Reverting changes.";
      toast.error(errorMessage);
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

  const handleAddAttachment = () => {
    setShowAttachmentSourceModal(true);
  };

  const handlePickUpload = () => {
    setShowAttachmentSourceModal(false);
    fileInputRef.current.click();
  };

  const handlePickFromDocs = () => {
    setShowAttachmentSourceModal(false);
    setShowDocPicker(true);
  };

  const fetchProjectDocs = async () => {
    if (!selectedProjectKey) return;
    setDocsLoading(true);
    try {
      const res = await getProjectDocuments(selectedProjectKey, "all");
      const allDocs = [
        ...(res.data.projectDocs || []),
        ...(res.data.taskAttachments || []),
        ...(res.data.commentAttachments || []),
        ...(res.data.meetingAttachments || []),
      ];
      setProjectDocs(allDocs);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load project documents");
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (showDocPicker) fetchProjectDocs();
  }, [showDocPicker]);

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

  const toggleDocSelection = (docId) => {
    setSelectedDocIds((prev) => (prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]));
  };

  const handleAttachDocsToTask = async () => {
    if (selectedDocIds.length === 0) {
      toast.warn("Please select at least one document");
      return;
    }
    try {
      const updatedTaskWithAttachment = await addAttachmentFromDocument(editableTask._id, selectedDocIds);
      setEditableTask(updatedTaskWithAttachment);
      onTaskUpdate(updatedTaskWithAttachment);
      toast.success("Attachment added successfully!");
      setShowDocPicker(false);
      setSelectedDocIds([]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to attach document.");
    }
  };

  const typeIconInfo = PREDEFINED_TASKTYPE_ICONS.find((i) => i.name === editableTask.taskTypeId?.icon);

  if (!task) return null;

  return (
    <div className={`flex flex-col bg-white h-full overflow-x-hidden ${task ? "" : "hidden"}`}>
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: "none" }} />
      <header className={`flex items-start gap-3 ${isCompact ? "p-3 border-b border-neutral-200" : "p-6 border-b border-neutral-200 bg-neutral-50"}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {typeIconInfo && (
              <span
                className="w-7 h-7 rounded flex items-center justify-center text-white text-sm flex-shrink-0"
                style={{ backgroundColor: typeIconInfo.color }}
                title={editableTask.taskTypeId.name}
              >
                <IconComponent name={editableTask.taskTypeId.icon} />
              </span>
            )}
            <a
              href={`/app/task/${editableTask.key}`}
              className={`font-semibold text-primary-600 hover:text-primary-700 hover:underline truncate ${isCompact ? "text-sm" : "text-lg"}`}
            >
              {editableTask.key}
            </a>
          </div>

          {!isCompact && (
            <div className="relative" data-replicated-value={editableTask.name}>
              <textarea
                className="w-full text-xl font-semibold text-neutral-900 border-none outline-none resize-none bg-transparent focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
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
          )}
        </div>
        {!isCompact && (
          <div className="flex items-start gap-2 flex-shrink-0">
            <ActionsMenu
              onDelete={() => setIsDeleteTaskModalOpen(true)}
              onAddAttachment={handleAddAttachment}
              onAddAttachmentFromDocs={handlePickFromDocs}
            />
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-neutral-500 hover:text-neutral-900 text-3xl font-light leading-none p-1 hover:bg-neutral-200 rounded"
              >
                &times;
              </button>
            )}
          </div>
        )}
        {isCompact && (
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 text-2xl font-light leading-none p-0.5 flex-shrink-0">
            ×
          </button>
        )}
      </header>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 overflow-x-hidden">
        {!isCompact && (
          <div className="flex border-b border-neutral-200 px-6 bg-white flex-shrink-0">
            <button
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === "Details" ? "border-primary-600 text-primary-600" : "border-transparent text-neutral-600 hover:text-neutral-900"}`}
              onClick={() => setActiveTab("Details")}
            >
              Details
            </button>
            <button
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === "Comments" ? "border-primary-600 text-primary-600" : "border-transparent text-neutral-600 hover:text-neutral-900"}`}
              onClick={() => setActiveTab("Comments")}
            >
              Comments
            </button>
            <button
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === "History" ? "border-primary-600 text-primary-600" : "border-transparent text-neutral-600 hover:text-neutral-900"}`}
              onClick={() => setActiveTab("History")}
            >
              History
            </button>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isCompact ? "p-3" : "p-6"} min-h-0`}>
          {!isCompact ? (
            <>
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
                  userProjectRole={userProjectRole}
                  user={user}
                />
              )}
              {activeTab === "Comments" && <CommentsTab taskId={editableTask._id} />}
              {activeTab === "History" && <HistoryTab taskId={editableTask._id} />}
            </>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase">Sprint</p>
                <p className="text-neutral-900 font-medium">{editableTask.sprintId?.name || "Backlog"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase">Status</p>
                <p
                  className={`inline-block px-2 py-1 text-xs font-medium rounded border ${statusCategoryStyles[editableTask.statusId?.category] || statusCategoryStyles.default}`}
                >
                  {editableTask.statusId?.name || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase">Assignee</p>
                <p className="text-neutral-900 font-medium">{editableTask.assigneeId?.fullname || "-"}</p>
              </div>
              <div className="pt-2 border-t border-neutral-200">
                <button
                  onClick={() => setActiveTab("Details")}
                  className="w-full text-center px-2 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded transition-colors"
                >
                  View Full Details
                </button>
              </div>
            </div>
          )}
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

      {showAttachmentSourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-5 w-[420px]">
            <h4 className="text-lg font-semibold mb-3">Add Attachment</h4>
            <div className="space-y-2">
              <button
                onClick={handlePickUpload}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600"
              >
                Upload File
              </button>
              <button
                onClick={handlePickFromDocs}
                className="w-full px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200"
              >
                Choose from Documents
              </button>
              <button
                onClick={() => setShowAttachmentSourceModal(false)}
                className="w-full px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDocPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-5 w-[520px] max-h-[70vh] flex flex-col">
            <h4 className="text-lg font-semibold mb-3">Attach from Documents</h4>
            <div className="mb-3">
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Search documents..."
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto border border-neutral-200 rounded-md">
              {docsLoading ? (
                <div className="p-4 text-center text-neutral-500">Loading documents...</div>
              ) : projectDocs.length === 0 ? (
                <div className="p-4 text-center text-neutral-500">No documents available</div>
              ) : (
                <div className="divide-y">
                  {projectDocs
                    .filter((doc) => {
                      const q = docSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (doc.filename || "").toLowerCase().includes(q);
                    })
                    .map((doc) => {
                      const attachedKeys = new Set((editableTask.attachments || []).map((att) => att.public_id || att.url));
                      const isAlreadyAttached = attachedKeys.has(doc.public_id || doc.url);
                      return (
                        <label key={doc._id} className={`flex items-center p-3 gap-3 ${isAlreadyAttached ? "opacity-50" : "hover:bg-neutral-50"}`}>
                          <input
                            type="checkbox"
                            disabled={isAlreadyAttached}
                            checked={selectedDocIds.includes(doc._id)}
                            onChange={() => toggleDocSelection(doc._id)}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-neutral-900 truncate">{doc.filename}</div>
                            <div className="text-xs text-neutral-500 truncate">
                              {doc.sourceType || "project"} • {doc.category || "other"}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowDocPicker(false);
                  setSelectedDocIds([]);
                }}
                className="px-4 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 rounded-md hover:bg-neutral-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAttachDocsToTask}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600"
              >
                Attach Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetailPanel;
