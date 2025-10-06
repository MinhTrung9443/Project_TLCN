import React, { useState, useEffect, useContext, useCallback } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { DndProvider, useDrop, useDrag } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ProjectContext } from "../../contexts/ProjectContext";
import sprintService from "../../services/sprintService";
import workflowService from "../../services/workflowService";
import { updateTaskStatus } from "../../services/taskService";
import { toast } from "react-toastify";
import "../../styles/pages/ManageSprint/ActiveSprintPage.css";

const PREDEFINED_TASKTYPE_ICONS = [
  { name: "task", color: "#4BADE8" },
  { name: "star", color: "#F6C343" },
  { name: "bolt", color: "#E97444" },
  { name: "check_circle", color: "#4ADE80" },
  { name: "calendar_month", color: "#8B5CF6" },
  { name: "bug_report", color: "#EF4444" },
];

const PREDEFINED_PRIORITY_ICONS = [
  { name: "task", color: "#4BADE8" },
  { name: "star", color: "#F6C343" },
  { name: "bolt", color: "#E97444" },
  { name: "check_circle", color: "#4ADE80" },
  { name: "calendar_month", color: "#8B5CF6" },
  { name: "bug_report", color: "#EF4444" },
];

const IconComponent = ({ name }) => <span className="material-symbols-outlined">{name}</span>;

// Task Card Component with Drag functionality
const TaskCard = ({ task, onStatusChange }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "task",
    item: { task },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const getTypeIcon = () => {
    const typeInfo = PREDEFINED_TASKTYPE_ICONS.find((i) => i.name === task.taskTypeId?.icon);
    return typeInfo || { name: "task", color: "#4BADE8" };
  };

  const getPriorityIcon = () => {
    const priorityInfo = PREDEFINED_PRIORITY_ICONS.find((i) => i.name === task.priorityId?.icon);
    return priorityInfo || { name: "task", color: "#4BADE8" };
  };

  const typeIcon = getTypeIcon();
  const priorityIcon = getPriorityIcon();

  return (
    <div ref={drag} className={`board-task-card ${isDragging ? "dragging" : ""}`} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <div className="board-task-top">
        <span className="board-task-checkbox material-symbols-outlined">check_box</span>
        <span className="board-task-code">{task.key}</span>
        <span className="board-task-menu material-symbols-outlined">more_horiz</span>
      </div>

      <div className="board-task-type-row">
        <span className="icon-wrapper-task" style={{ backgroundColor: typeIcon.color }} title={task.taskTypeId?.name}>
          <IconComponent name={task.taskTypeId?.icon || "task"} />
        </span>
        <span className="board-task-type-name">{task.taskTypeId?.name || "Task"}</span>
      </div>

      <div className="board-task-name">{task.name}</div>

      <div className="board-task-footer">
        <span className="icon-wrapper-priority" style={{ backgroundColor: priorityIcon.color }} title={task.priorityId?.name}>
          <IconComponent name={task.priorityId?.icon || "task"} />
        </span>
        <div className="board-task-assignee">
          {task.assigneeId ? (
            <div className="avatar" title={task.assigneeId.fullname}>
              {task.assigneeId.avatar ? (
                <img src={task.assigneeId.avatar} alt={task.assigneeId.fullname} />
              ) : (
                <span>{task.assigneeId.fullname.charAt(0).toUpperCase()}</span>
              )}
            </div>
          ) : (
            <div className="avatar unassigned" title="Unassigned">
              <span className="material-symbols-outlined">person</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Column Component with Drop functionality
const Column = ({ status, tasks, onDrop, onTaskMove }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "task",
    drop: (item) => onDrop(item, status),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const getCategoryLabel = () => {
    switch (status.category) {
      case "To Do":
        return "TO DO";
      case "In Progress":
        return "IN PROGRESS";
      case "Done":
        return "DONE";
      default:
        return status.name.toUpperCase();
    }
  };

  const getCategoryClass = () => {
    switch (status.category) {
      case "To Do":
        return "todo";
      case "In Progress":
        return "inprogress";
      case "Done":
        return "done";
      default:
        return "default";
    }
  };

  return (
    <div className="board-column" ref={drop}>
      <div className={`board-column-header board-column-header-${getCategoryClass()}`}>
        {getCategoryLabel()}
        <span className="board-column-count">({tasks.length})</span>
      </div>
      <div className={`board-column-body ${isOver ? "drop-over" : ""}`} style={{ minHeight: "400px" }}>
        {tasks.length === 0 ? (
          <div className="board-column-empty">Drop tasks here</div>
        ) : (
          tasks.map((task) => <TaskCard key={task._id} task={task} onStatusChange={onTaskMove} />)
        )}
      </div>
    </div>
  );
};

// Sprint Selector Dropdown Component
const SprintSelector = ({ currentSprint, availableSprints, onSprintChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="sprint-selector">
      <button className="sprint-selector-button" onClick={() => setIsOpen(!isOpen)}>
        <span className="sprint-name">{currentSprint?.name || "Select Sprint"}</span>
        <span className="material-symbols-outlined">{isOpen ? "expand_less" : "expand_more"}</span>
      </button>

      {isOpen && (
        <div className="sprint-dropdown">
          {availableSprints.map((sprint) => (
            <div
              key={sprint._id}
              className={`sprint-option ${currentSprint?._id === sprint._id ? "selected" : ""}`}
              onClick={() => {
                onSprintChange(sprint);
                setIsOpen(false);
              }}
            >
              {sprint.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ActiveSprintPage = () => {
  const { projectKey } = useParams();
  const { selectedProjectKey } = useContext(ProjectContext);
  const [searchParams] = useSearchParams();

  const [currentSprint, setCurrentSprint] = useState(null);
  const [availableSprints, setAvailableSprints] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [workflowStatuses, setWorkflowStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  const effectiveProjectKey = projectKey || selectedProjectKey;

  // Fetch started sprints
  const fetchStartedSprints = useCallback(async () => {
    try {
      if (!effectiveProjectKey) return;

      const sprints = await sprintService.getStartedSprints(effectiveProjectKey);
      setAvailableSprints(sprints);

      // Get sprint from URL parameter or use first available
      const sprintId = searchParams.get("sprint");
      if (sprintId) {
        const selectedSprint = sprints.find((s) => s._id === sprintId);
        if (selectedSprint) {
          setCurrentSprint(selectedSprint);
          return selectedSprint;
        }
      }

      if (sprints.length > 0) {
        setCurrentSprint(sprints[0]);
        return sprints[0];
      }

      return null;
    } catch (error) {
      console.error("Error fetching started sprints:", error);
      toast.error("Failed to load sprints");
      return null;
    }
  }, [effectiveProjectKey, searchParams]);

  // Fetch workflow statuses
  const fetchWorkflow = useCallback(async () => {
    try {
      const workflow = await workflowService.getDefaultWorkflow();
      setWorkflowStatuses(workflow.statuses || []);
    } catch (error) {
      console.error("Error fetching workflow:", error);
      toast.error("Failed to load workflow");
    }
  }, []);

  // Fetch tasks for current sprint
  const fetchSprintTasks = useCallback(async (sprint) => {
    if (!sprint) {
      setTasks([]);
      return;
    }

    try {
      const result = await sprintService.getTasksBySprintWithStatus(sprint._id);
      setTasks(result.tasks || []);
    } catch (error) {
      console.error("Error fetching sprint tasks:", error);
      toast.error("Failed to load tasks");
    }
  }, []);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await fetchWorkflow();
      const sprint = await fetchStartedSprints();
      if (sprint) {
        await fetchSprintTasks(sprint);
      }
      setLoading(false);
    };

    if (effectiveProjectKey) {
      initializeData();
    }
  }, [effectiveProjectKey, fetchWorkflow, fetchStartedSprints, fetchSprintTasks]);

  // Handle sprint change
  const handleSprintChange = (sprint) => {
    setCurrentSprint(sprint);
    fetchSprintTasks(sprint);

    // Update URL parameter
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sprint", sprint._id);
    window.history.replaceState(null, "", `?${newParams.toString()}`);
  };

  // Handle task drop/status change
  const handleTaskDrop = async (dragItem, targetStatus) => {
    const { task } = dragItem;

    if (task.statusId?._id === targetStatus._id) {
      return; // No change needed
    }

    try {
      await updateTaskStatus(task._id, targetStatus._id);

      // Update local state
      setTasks((prevTasks) => prevTasks.map((t) => (t._id === task._id ? { ...t, statusId: targetStatus } : t)));

      toast.success("Task status updated successfully!");
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status");
    }
  };

  // Group tasks by status
  const getTasksByStatus = (status) => {
    return tasks.filter((task) => task.statusId?._id === status._id || (task.statusId?.category === status.category && !task.statusId?._id));
  };

  if (loading) {
    return (
      <div className="active-sprint-loading">
        <div className="loading-spinner"></div>
        <span>Loading sprint data...</span>
      </div>
    );
  }

  if (availableSprints.length === 0) {
    return (
      <div className="active-sprint-empty">
        <div className="empty-state">
          <span className="material-symbols-outlined">sprint</span>
          <h3>No Active Sprints</h3>
          <p>There are no started sprints in this project.</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="active-sprint-page">
        <div className="active-sprint-header">
          <SprintSelector currentSprint={currentSprint} availableSprints={availableSprints} onSprintChange={handleSprintChange} />
        </div>

        <div className="active-sprint-board">
          {workflowStatuses.map((status) => (
            <Column key={status._id} status={status} tasks={getTasksByStatus(status)} onDrop={handleTaskDrop} />
          ))}
        </div>
      </div>
    </DndProvider>
  );
};

export default ActiveSprintPage;
