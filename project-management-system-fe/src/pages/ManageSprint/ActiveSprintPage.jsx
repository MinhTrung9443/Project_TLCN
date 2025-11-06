import React, { useContext } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ProjectContext } from "../../contexts/ProjectContext";
import { updateTaskStatus } from "../../services/taskService";
import { toast } from "react-toastify";
import { useSprintData } from "../../hooks/useSprintData";
import BoardColumn from "../../components/sprint/BoardColumn";
import SprintSelector from "../../components/sprint/SprintSelector";
import "../../styles/pages/ManageSprint/ActiveSprintPage.css";

const ActiveSprintPage = () => {
  const { projectKey } = useParams();
  const { selectedProjectKey } = useContext(ProjectContext);
  const [searchParams] = useSearchParams();

  const effectiveProjectKey = projectKey || selectedProjectKey;

  // Use custom hook for sprint data management
  const { currentSprint, setCurrentSprint, availableSprints, tasks, setTasks, workflowStatuses, loading, fetchSprintTasks } = useSprintData(
    effectiveProjectKey,
    searchParams
  );

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
            <BoardColumn key={status._id} status={status} tasks={getTasksByStatus(status)} onDrop={handleTaskDrop} />
          ))}
        </div>
      </div>
    </DndProvider>
  );
};

export default ActiveSprintPage;
