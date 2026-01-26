import React, { useState } from "react";
import Select from "react-select";
import RichTextEditor from "../common/RichTextEditor";
import AttachmentsTab from "./AttachmentsTab";
import LinkedTasksTab from "./LinkedTasksTab";
import LogTimeModal from "./LogTimeModal";
import TimeLogList from "./TimeLogList";
const statusCategoryStyles = {
  "To Do": "bg-neutral-100 text-neutral-700 border border-neutral-200",
  "In Progress": "bg-primary-100 text-primary-700 border border-primary-200",
  Done: "bg-success-100 text-success-700 border border-success-200",
  default: "bg-neutral-100 text-neutral-700 border border-neutral-200",
};
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
  onUnlinkTask,
  userProjectRole,
  user,
}) => {
  const [showLogTimeModal, setShowLogTimeModal] = useState(false);
  const [timeLogsKey, setTimeLogsKey] = useState(0);

  const handleDescriptionUpdate = (content) => {
    handleUpdate("description", content);
  };

  const handleTimeLogged = () => {
    setShowLogTimeModal(false);
    setTimeLogsKey((prev) => prev + 1); // Refresh time logs
  };

  const handleTimeLogsUpdate = (totalTime) => {
    // Update actualTime in editableTask
    setEditableTask((prev) => ({ ...prev, actualTime: totalTime }));
  };

  const findOption = (options, field) => {
    if (!field) return null;
    // Xử lý trường hợp field là object (có _id) hoặc là string ID
    let idToFind;
    if (typeof field === "object" && field !== null) {
      idToFind = field._id || field;
    } else {
      idToFind = field;
    }
    // Convert to string để so sánh
    const idString = idToFind?.toString();
    const result = options.find((opt) => opt.value?.toString() === idString);
    return result;
  };

  const statusOptions = Array.isArray(statuses)
    ? statuses.map((status) => ({
        value: status._id,
        label: status.name,
        category: status.category,
      }))
    : [];

  const currentStatusId = editableTask.statusId?._id || editableTask.statusId;
  const selectedStatusOption = statusOptions.find((opt) => opt.value === currentStatusId);

  const formatOptionLabel = ({ label, category }) => {
    const styleClass = statusCategoryStyles[category] || statusCategoryStyles.default;
    return (
      <div className="inline-block">
        <span className={`${styleClass} rounded px-2 py-1 font-semibold text-xs uppercase`}>{label}</span>
      </div>
    );
  };

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      border: "1px solid #e2e8f0", // Thêm viền
      borderRadius: "8px", // Bo góc
      boxShadow: state.isFocused ? "0 0 0 1px #6366f1" : "none", // Hiệu ứng khi focus
      "&:hover": {
        borderColor: "#cbd5e1", // Viền đậm hơn khi hover
      },
      minHeight: "42px", // Chiều cao đồng bộ
      backgroundColor: "white",
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? "#6366f1" : state.isFocused ? "#f1f5f9" : "white",
      color: state.isSelected ? "white" : "inherit",
      cursor: "pointer",
    }),
    singleValue: (provided) => ({
      // Style cho giá trị đang được chọn
      ...provided,
      paddingLeft: "4px",
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: "2px 4px",
    }),
  };

  return (
    <>
      <div className="p-6 border-b border-neutral-200">
        <div className="space-y-2">
          <strong className="text-sm font-medium text-neutral-700">Progress</strong>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={editableTask.progress || 0}
              className="flex-1 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              onChange={(e) => setEditableTask((prev) => ({ ...prev, progress: parseInt(e.target.value, 10) }))}
              onMouseUp={(e) => handleUpdate("progress", parseInt(e.target.value, 10))}
            />
            <span className="text-sm font-semibold text-neutral-700 min-w-[3rem] text-right">{editableTask.progress || 0}%</span>
          </div>
        </div>
      </div>

      <div className="p-6 border-b border-neutral-200 grid grid-cols-2 gap-x-6 gap-y-4">
        <div className="space-y-2">
          <strong className="text-sm font-medium text-neutral-700">Status</strong>
          <Select
            value={selectedStatusOption}
            options={statusOptions}
            onChange={(option) => handleUpdate("statusId", option.value)}
            formatOptionLabel={formatOptionLabel}
            styles={customSelectStyles} // Áp dụng style custom ở đây
            placeholder={statusOptions.length === 0 ? "Loading..." : "Select..."}
          />
        </div>
        <div className="space-y-2">
          <strong className="text-sm font-medium text-neutral-700">Assignee</strong>
          <Select
            value={findOption(projectMembers, editableTask.assigneeId)}
            options={projectMembers} // Sử dụng danh sách members
            onChange={(option) => handleUpdate("assigneeId", option ? option.value : null)}
            isClearable={!editableTask.assigneeId}
            placeholder="Select..."
            isDisabled={Boolean(editableTask.assigneeId)}
          />
        </div>
        <div className="space-y-2">
          <strong className="text-sm font-medium text-neutral-700">Reporter</strong>
          <input
            type="text"
            value={editableTask.reporterId?.fullname || "N/A"}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            disabled
            style={{ backgroundColor: "#f1f5f9", cursor: "not-allowed" }}
          />
        </div>
        <div className="space-y-2">
          <strong className="text-sm font-medium text-neutral-700">Type</strong>
          <Select
            value={findOption(projectTaskTypes, editableTask.taskTypeId)}
            options={projectTaskTypes}
            onChange={(option) => handleUpdate("taskTypeId", option.value)}
            placeholder={projectTaskTypes.length === 0 ? "Loading..." : "Select..."}
          />
        </div>
        <div className="space-y-2">
          <strong className="text-sm font-medium text-neutral-700">Priority</strong>
          <Select
            value={findOption(projectPriorities, editableTask.priorityId?._id)}
            options={projectPriorities}
            onChange={(option) => handleUpdate("priorityId", option.value)}
            placeholder={projectPriorities.length === 0 ? "Loading..." : "Select..."}
          />
        </div>
        <div className="space-y-2">
          <strong className="text-sm font-medium text-neutral-700">Sprint</strong>
          <Select
            value={findOption(projectSprints, editableTask.sprintId?._id)}
            options={projectSprints}
            onChange={(option) => handleUpdate("sprintId", option ? option.value : null)}
            isClearable
            placeholder={!editableTask ? "" : projectSprints.length === 0 && editableTask.projectId ? "Loading..." : "Backlog"}
          />
        </div>
        <div className="space-y-2">
          <strong className="text-sm font-medium text-neutral-700">Platform</strong>
          <Select
            value={findOption(projectPlatforms, editableTask.platformId?._id)}
            options={projectPlatforms}
            onChange={(option) => handleUpdate("platformId", option.value)}
            placeholder={projectPlatforms.length === 0 ? "Loading..." : "Select..."}
          />
        </div>
        <div className="space-y-2">
          <strong className="text-sm font-medium text-neutral-700">Start Date</strong>
          <input
            type="date"
            value={editableTask.startDate ? new Date(editableTask.startDate).toISOString().split("T")[0] : ""}
            onChange={(e) => handleUpdate("startDate", e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          />
        </div>
        <div className="space-y-2">
          <strong className="text-sm font-medium text-neutral-700">Due Date</strong>
          <input
            type="date"
            value={editableTask.dueDate ? new Date(editableTask.dueDate).toISOString().split("T")[0] : ""}
            onChange={(e) => handleUpdate("dueDate", e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
          />
        </div>
      </div>

      {/* Time Tracking Section */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-neutral-900">Time Tracking</h4>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            onClick={() => setShowLogTimeModal(true)}
          >
            <span className="material-symbols-outlined text-lg">schedule</span>
            Log Time
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-2">
            <strong className="text-sm font-medium text-neutral-700">Estimated Time (hours)</strong>
            <input
              type="number"
              min="0"
              step="0.5"
              value={editableTask.estimatedTime || 0}
              onChange={(e) => setEditableTask((prev) => ({ ...prev, estimatedTime: parseFloat(e.target.value) || 0 }))}
              onBlur={(e) => handleUpdate("estimatedTime", parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              placeholder="0"
              disabled={user?.role !== "admin" && userProjectRole === "MEMBER"}
              style={user?.role !== "admin" && userProjectRole === "MEMBER" ? { backgroundColor: "#f1f5f9", cursor: "not-allowed" } : {}}
            />
          </div>
          <div className="space-y-2">
            <strong className="text-sm font-medium text-neutral-700">Actual Time (hours)</strong>
            <input
              type="number"
              value={editableTask.actualTime || 0}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              disabled
              style={{ backgroundColor: "#f1f5f9", cursor: "not-allowed" }}
            />
          </div>
        </div>

        {/* Time Remaining Bar */}
        {editableTask.estimatedTime > 0 && (
          <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center justify-between mb-2">
              <strong className="text-sm font-medium text-neutral-700">Time Remaining</strong>
              <span className="text-sm">
                {(() => {
                  const remaining = (editableTask.estimatedTime || 0) - (editableTask.actualTime || 0);
                  const isOvertime = remaining < 0;
                  const absRemaining = Math.abs(remaining);
                  const hours = Math.floor(absRemaining);
                  const minutes = Math.round((absRemaining - hours) * 60);

                  return (
                    <span style={{ color: isOvertime ? "#ef4444" : "#10b981", fontWeight: "600" }}>
                      {isOvertime ? "+" : ""}
                      {hours}h {minutes > 0 ? `${minutes}m` : ""} {isOvertime ? "over budget" : "remaining"}
                    </span>
                  );
                })()}
              </span>
            </div>
            <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden my-3">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${Math.min(((editableTask.actualTime || 0) / (editableTask.estimatedTime || 1)) * 100, 100)}%`,
                  backgroundColor: (editableTask.actualTime || 0) > (editableTask.estimatedTime || 0) ? "#ef4444" : "#3b82f6",
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <span>Spent: {editableTask.actualTime || 0}h</span>
              <span>Budget: {editableTask.estimatedTime || 0}h</span>
            </div>
          </div>
        )}

        {/* Time Logs List */}
        <TimeLogList key={timeLogsKey} taskId={editableTask._id} onTimeLogsUpdate={handleTimeLogsUpdate} />
      </div>

      {/* Description */}
      <div className="p-6 border-b border-neutral-200">
        <h4 className="text-lg font-semibold text-neutral-900 mb-4">Description</h4>
        <RichTextEditor value={editableTask.description || ""} onChange={handleDescriptionUpdate} />
      </div>
      <div className="p-6 border-b border-neutral-200">
        <LinkedTasksTab task={editableTask} allProjectTasks={allProjectTasks} onLink={onLinkTask} onUnlink={onUnlinkTask} />
      </div>

      <div className="p-6 border-b border-neutral-200">
        <AttachmentsTab attachments={editableTask.attachments} onAdd={onAddAttachment} onDelete={onDeleteAttachment} />
      </div>

      <footer className="p-4 bg-neutral-50 border-t border-neutral-200">
        <span className="text-sm text-neutral-600">Created By: {editableTask.createdById?.fullname || "N/A"}</span>
      </footer>

      {/* Log Time Modal */}
      <LogTimeModal isOpen={showLogTimeModal} taskId={editableTask._id} onClose={() => setShowLogTimeModal(false)} onTimeLogged={handleTimeLogged} />
    </>
  );
};

export default TaskDetailsTab;
