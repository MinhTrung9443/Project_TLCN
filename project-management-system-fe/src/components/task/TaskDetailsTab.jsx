import React, { useState } from "react";
import Select from "react-select";
import RichTextEditor from "../common/RichTextEditor";
import AttachmentsTab from "./AttachmentsTab";
import LinkedTasksTab from "./LinkedTasksTab";
import LogTimeModal from "./LogTimeModal";
import TimeLogList from "./TimeLogList";
const statusCategoryStyles = {
  "To Do": {
    backgroundColor: "#dfe1e6", // Xám
    color: "#42526E",
  },
  "In Progress": {
    backgroundColor: "#deebff", // Xanh dương nhạt
    color: "#0747A6",
  },
  Done: {
    backgroundColor: "#e3fcef", // Xanh lá nhạt
    color: "#0B875B",
  },
  // Thêm màu cho các category khác nếu có
  default: {
    // Màu mặc định nếu không khớp
    backgroundColor: "#dfe1e6",
    color: "#42526E",
  },
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
    const style = statusCategoryStyles[category] || statusCategoryStyles.default;
    return (
      <div style={{ display: "inline-block" }}>
        <span
          style={{
            ...style,
            borderRadius: "3px",
            padding: "3px 8px",
            fontWeight: 600,
            fontSize: "12px",
            textTransform: "uppercase", // In hoa cho đẹp
          }}
        >
          {label}
        </span>
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
            value={selectedStatusOption}
            options={statusOptions}
            onChange={(option) => handleUpdate("statusId", option.value)}
            formatOptionLabel={formatOptionLabel}
            styles={customSelectStyles} // Áp dụng style custom ở đây
            placeholder={statusOptions.length === 0 ? "Loading..." : "Select..."}
          />
        </div>
        <div className="detail-item-editable">
          <strong>Assignee</strong>
          <Select
            value={findOption(projectMembers, editableTask.assigneeId)}
            options={projectMembers} // Sử dụng danh sách members
            onChange={(option) => handleUpdate("assigneeId", option ? option.value : null)}
            isClearable={!editableTask.assigneeId}
            placeholder="Select..."
            isDisabled={Boolean(editableTask.assigneeId)}
          />
        </div>
        <div className="detail-item-editable">
          <strong>Reporter</strong>
          <input
            type="text"
            value={editableTask.reporterId?.fullname || "N/A"}
            className="editable-input"
            disabled
            style={{ backgroundColor: "#f1f5f9", cursor: "not-allowed" }}
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
            placeholder={!editableTask ? "" : projectSprints.length === 0 && editableTask.projectId ? "Loading..." : "Backlog"}
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

      {/* Time Tracking Section */}
      <div className="panel-section">
        <div className="section-header">
          <h4>Time Tracking</h4>
          <button className="log-time-btn" onClick={() => setShowLogTimeModal(true)}>
            <span className="material-symbols-outlined">schedule</span>
            Log Time
          </button>
        </div>

        <div className="detail-grid-editable">
          <div className="detail-item-editable">
            <strong>Estimated Time (hours)</strong>
            <input
              type="number"
              min="0"
              step="0.5"
              value={editableTask.estimatedTime || 0}
              onChange={(e) => setEditableTask((prev) => ({ ...prev, estimatedTime: parseFloat(e.target.value) || 0 }))}
              onBlur={(e) => handleUpdate("estimatedTime", parseFloat(e.target.value) || 0)}
              className="editable-input"
              placeholder="0"
              disabled={user?.role !== "admin" && userProjectRole === "MEMBER"}
              style={user?.role !== "admin" && userProjectRole === "MEMBER" ? { backgroundColor: "#f1f5f9", cursor: "not-allowed" } : {}}
            />
          </div>
          <div className="detail-item-editable">
            <strong>Actual Time (hours)</strong>
            <input
              type="number"
              value={editableTask.actualTime || 0}
              className="editable-input"
              disabled
              style={{ backgroundColor: "#f1f5f9", cursor: "not-allowed" }}
            />
          </div>
        </div>

        {/* Time Remaining Bar */}
        {editableTask.estimatedTime > 0 && (
          <div className="time-remaining-section">
            <div className="time-remaining-header">
              <strong>Time Remaining</strong>
              <span className="time-remaining-text">
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
            <div className="time-remaining-bar">
              <div
                className="time-spent-fill"
                style={{
                  width: `${Math.min(((editableTask.actualTime || 0) / (editableTask.estimatedTime || 1)) * 100, 100)}%`,
                  backgroundColor: (editableTask.actualTime || 0) > (editableTask.estimatedTime || 0) ? "#ef4444" : "#3b82f6",
                }}
              ></div>
            </div>
            <div className="time-remaining-labels">
              <span className="time-label">Spent: {editableTask.actualTime || 0}h</span>
              <span className="time-label">Budget: {editableTask.estimatedTime || 0}h</span>
            </div>
          </div>
        )}

        {/* Time Logs List */}
        <TimeLogList key={timeLogsKey} taskId={editableTask._id} onTimeLogsUpdate={handleTimeLogsUpdate} />
      </div>

      {/* Description */}
      <div className="panel-section">
        <h4>Description</h4>
        <RichTextEditor value={editableTask.description || ""} onChange={handleDescriptionUpdate} />
      </div>
      <div className="panel-section">
        <LinkedTasksTab task={editableTask} allProjectTasks={allProjectTasks} onLink={onLinkTask} onUnlink={onUnlinkTask} />
      </div>

      <div className="panel-section">
        <AttachmentsTab attachments={editableTask.attachments} onAdd={onAddAttachment} onDelete={onDeleteAttachment} />
      </div>

      <footer className="panel-footer">
        <span>Created By: {editableTask.createdById?.fullname || "N/A"}</span>
      </footer>

      {/* Log Time Modal */}
      <LogTimeModal isOpen={showLogTimeModal} taskId={editableTask._id} onClose={() => setShowLogTimeModal(false)} onTimeLogged={handleTimeLogged} />
    </>
  );
};

export default TaskDetailsTab;
