import React, { useContext, useEffect, useState } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ProjectContext } from "../../contexts/ProjectContext";
import { updateTaskStatus } from "../../services/taskService";
import sprintService from "../../services/sprintService";
import { toast } from "react-toastify";
import { useSprintData } from "../../hooks/useSprintData";
import BoardColumn from "../../components/sprint/BoardColumn";
import SprintSelector from "../../components/sprint/SprintSelector";
import { isTransitionAllowed, getTransitionErrorMessage } from "../../utils/workflowTransitions";
import "../../styles/pages/ManageSprint/ActiveSprintPage.css";

const ActiveSprintPage = () => {
  const { projectKey } = useParams();
  const { selectedProjectKey } = useContext(ProjectContext);
  const [searchParams] = useSearchParams();
  const [isCompleting, setIsCompleting] = useState(false);
  const navigate = useNavigate();

  const effectiveProjectKey = projectKey || selectedProjectKey;

  // Use custom hook for sprint data management
  const { currentSprint, setCurrentSprint, availableSprints, tasks, setTasks, workflowStatuses, workflow, loading, fetchSprintTasks } = useSprintData(
    effectiveProjectKey,
    searchParams
  );

  // Debug: Log workflow when it changes
  useEffect(() => {
    console.log("=== Workflow Loaded ===");
    console.log("Project Key:", effectiveProjectKey);
    console.log("Workflow:", workflow);
    console.log("Workflow Statuses:", workflowStatuses);
  }, [workflow, workflowStatuses, effectiveProjectKey]);

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

    // Validate transition using workflow rules
    const fromStatusId = task.statusId?._id;
    const toStatusId = targetStatus._id;

    if (!isTransitionAllowed(workflow, fromStatusId, toStatusId)) {
      const fromStatusName = task.statusId?.name || "Unknown";
      const toStatusName = targetStatus.name || "Unknown";
      toast.error(getTransitionErrorMessage(fromStatusName, toStatusName));
      return;
    }

    try {
      await updateTaskStatus(projectKey, task._id, targetStatus._id);

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

  // Handle complete sprint
  const handleCompleteSprint = async () => {
    if (!currentSprint) return;

    const incompleteTasks = tasks.filter((task) => task.statusId?.category !== "Done");

    if (incompleteTasks.length > 0) {
      const confirmed = window.confirm(
        `This sprint has ${incompleteTasks.length} incomplete task(s). Are you sure you want to complete it? Incomplete tasks will be moved to backlog.`
      );
      if (!confirmed) return;
    }

    setIsCompleting(true);
    try {
      await sprintService.updateSprint(currentSprint._id, { status: "Completed" });
      toast.success("Sprint completed successfully!");

      // Navigate back to sprint list with project context preserved
      navigate(`/task-mgmt/projects/${effectiveProjectKey}/active-sprint`);
    } catch (error) {
      console.error("Error completing sprint:", error);
      toast.error("Failed to complete sprint");
    } finally {
      setIsCompleting(false);
    }
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

          {currentSprint && (
            <button className="btn-complete-sprint" onClick={handleCompleteSprint} disabled={isCompleting}>
              <span className="material-symbols-outlined">check_circle</span>
              {isCompleting ? "Completing..." : "Complete Sprint"}
            </button>
          )}
        </div>

        <div className="active-sprint-board">
          {workflowStatuses.map((status) => (
            <BoardColumn key={status._id} status={status} tasks={getTasksByStatus(status)} onDrop={handleTaskDrop} workflow={workflow} />
          ))}
        </div>
      </div>
    </DndProvider>
  );
};

export default ActiveSprintPage;
