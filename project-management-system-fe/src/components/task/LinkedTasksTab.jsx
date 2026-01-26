// src/components/task/LinkedTasksTab.jsx

import React, { useState, useMemo } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import { IconComponent } from "../common/IconPicker";
import { FaTrash } from "react-icons/fa";

const PREDEFINED_TASKTYPE_ICONS_MAP = {
  FaBug: "#E44D42",
  FaTasks: "#4BADE8",
  FaStar: "#2ECC71",
  FaCheckSquare: "#5297FF",
};

const LinkTypeOptions = [
  { value: "relates to", label: "relates to" },
  { value: "blocks", label: "blocks" },
  { value: "is blocked by", label: "is blocked by" },
  { value: "clones", label: "clones" },
  { value: "is cloned by", label: "is cloned by" },
  { value: "duplicates", label: "duplicates" },
  { value: "is duplicated by", label: "is duplicated by" },
];

const LinkedTasksTab = ({ task, allProjectTasks, onLink, onUnlink }) => {
  const [selectedLinkType, setSelectedLinkType] = useState(LinkTypeOptions[0]);
  const [selectedTaskToLink, setSelectedTaskToLink] = useState(null);
  const [isLinking, setIsLinking] = useState(false);

  const taskOptions = useMemo(() => {
    // Thêm phòng thủ để không bao giờ crash
    const linkedTasks = task.linkedTasks || [];
    const linkedTaskIds = new Set(linkedTasks.map((link) => link.taskId._id));
    return (allProjectTasks || [])
      .filter((t) => t._id !== task._id && !linkedTaskIds.has(t._id))
      .map((t) => ({
        value: t._id,
        label: `${t.key}: ${t.name}`,
      }));
  }, [allProjectTasks, task]);

  const handleLink = async () => {
    if (!selectedTaskToLink || !selectedLinkType) {
      toast.warn("Please select a link type and a task.");
      return;
    }
    setIsLinking(true);
    try {
      await onLink(selectedTaskToLink.value, selectedLinkType.value);
      setSelectedTaskToLink(null);
    } catch (error) {
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async (linkId) => {
    await onUnlink(linkId);
  };
  const getIconInfo = (taskTypeId) => {
    if (!taskTypeId || !taskTypeId.icon) return { color: "#ccc" };
    return { color: PREDEFINED_TASKTYPE_ICONS_MAP[taskTypeId.icon] || "#7A869A" };
  };

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-neutral-900">Linked Tasks</h4>
      <div className="flex gap-3">
        <Select
          className="min-w-[160px] w-40"
          value={selectedLinkType}
          onChange={setSelectedLinkType}
          options={LinkTypeOptions}
          menuPortalTarget={document.body}
          styles={{
            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            container: (base) => ({ ...base, minWidth: "160px", width: "160px" }),
            control: (base) => ({ ...base, minWidth: "160px", width: "160px" }),
          }}
        />
        <Select
          className="flex-1 min-w-[200px]"
          value={selectedTaskToLink}
          onChange={setSelectedTaskToLink}
          options={taskOptions}
          placeholder="Search task to link"
          isClearable
          menuPortalTarget={document.body}
          styles={{
            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            container: (base) => ({ ...base, minWidth: "200px", flex: 1 }),
            control: (base) => ({ ...base, minWidth: "200px" }),
          }}
        />
        <button
          onClick={handleLink}
          disabled={isLinking || !selectedTaskToLink}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLinking ? "Linking..." : "Link"}
        </button>
      </div>

      <ul className="space-y-2">
        {(task.linkedTasks || []).map((link) => {
          const linkedTaskInfo = link.taskId;
          if (!linkedTaskInfo) return null;
          const iconInfo = getIconInfo(linkedTaskInfo.taskTypeId);
          return (
            <li
              key={link._id}
              className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">{link.type}</span>
              <div className="flex items-center gap-2 flex-1">
                <span
                  className="w-6 h-6 rounded flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: iconInfo.color }}
                  title={linkedTaskInfo.taskTypeId?.name}
                >
                  <IconComponent name={linkedTaskInfo.taskTypeId?.icon || "FaTasks"} />
                </span>
                <span className="text-sm font-semibold text-primary-600">{linkedTaskInfo.key}</span>
                <span className="text-sm text-neutral-700 truncate">{linkedTaskInfo.name}</span>
              </div>
              <button onClick={() => handleUnlink(link._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <FaTrash />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default LinkedTasksTab;
