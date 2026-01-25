import React, { useContext, useEffect, useState } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ProjectContext } from "../../contexts/ProjectContext";
import { updateTaskStatus } from "../../services/taskService";
import sprintService from "../../services/sprintService";
import { getProjectByKey } from "../../services/projectService";
import { toast } from "react-toastify";
import { useSprintData } from "../../hooks/useSprintData";
import BoardColumn from "../../components/sprint/BoardColumn";
import SprintSelector from "../../components/sprint/SprintSelector";
import { isTransitionAllowed, getTransitionErrorMessage } from "../../utils/workflowTransitions";
import { useAuth } from "../../contexts/AuthContext";
import ConfirmationModal from "../../components/common/ConfirmationModal";

const ActiveSprintPage = () => {
  const { projectKey } = useParams();
  const { selectedProjectKey, projectData } = useContext(ProjectContext);
  const [searchParams] = useSearchParams();
  const [isCompleting, setIsCompleting] = useState(false);
  const [userProjectRole, setUserProjectRole] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [incompleteCount, setIncompleteCount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  const effectiveProjectKey = projectKey || selectedProjectKey;

  // Use custom hook for sprint data management
  const { currentSprint, setCurrentSprint, availableSprints, tasks, setTasks, workflowStatuses, workflow, loading, fetchSprintTasks } = useSprintData(
    effectiveProjectKey,
    searchParams,
  );

  // Fetch user project role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!effectiveProjectKey || !user) return;
      try {
        const projectRes = await getProjectByKey(effectiveProjectKey);
        const project = projectRes.data;
        const userId = user._id;
        let role = null;
        if (user.role === "admin") {
          role = "ADMIN";
        } else {
          // Check PM
          const member = project.members?.find((m) => {
            const memId = m.userId?._id || m.userId;
            return memId === userId;
          });
          if (member && member.role === "PROJECT_MANAGER") {
            role = "PROJECT_MANAGER";
          } else {
            // Check LEADER trong các team
            const isLeader = (project.teams || []).some((team) => {
              const leaderId = team.leaderId?._id || team.leaderId;
              return leaderId === userId;
            });
            if (isLeader) {
              role = "LEADER";
            } else {
              // Check là member trong bất kỳ team nào
              const isTeamMember = (project.teams || []).some((team) =>
                (team.members || []).some((m) => {
                  const memId = m?._id || m;
                  return memId === userId;
                }),
              );
              if (isTeamMember) {
                role = "MEMBER";
              } else {
                role = null;
              }
            }
          }
        }
        setUserProjectRole(role);
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };
    fetchUserRole();
  }, [effectiveProjectKey, user]);

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

  // Handle complete sprint (show confirmation modal if there are incomplete tasks)
  const handleCompleteSprint = async () => {
    if (!currentSprint) return;

    const incompleteTasks = tasks.filter((task) => task.statusId?.category !== "Done");

    if (incompleteTasks.length > 0) {
      setIncompleteCount(incompleteTasks.length);
      setConfirmModalOpen(true);
      return;
    }

    // No incomplete tasks - proceed directly
    await completeSprintConfirmed();
  };

  // Actual completion logic extracted so it can be invoked from modal confirm
  const completeSprintConfirmed = async () => {
    setConfirmModalOpen(false);
    setIsCompleting(true);
    try {
      await sprintService.updateSprint(currentSprint._id, { status: "Completed" });
      toast.success("Sprint completed successfully!");

      // Navigate back to sprint list with project context preserved
      navigate(`/app/task-mgmt/projects/${effectiveProjectKey}/active-sprint`);
    } catch (error) {
      console.error("Error completing sprint:", error);
      toast.error("Failed to complete sprint");
    } finally {
      setIsCompleting(false);
    }
  };

  const canManageSprints = user?.role === "admin" || userProjectRole === "PROJECT_MANAGER";

  // Ẩn nút Complete Sprint nếu project là Kanban
  const isKanbanProject = projectData?.type === "Kanban";

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
        <div className="sprint-hero-section">
          <div className="sprint-hero-shape"></div>
          <div className="sprint-hero-content">
            <h1 className="sprint-page-title">Active Sprint</h1>
            <p className="sprint-page-subtitle">Manage and track your sprint board</p>
          </div>
        </div>

        <div className="sprint-container">
          <div className="sprint-controls">
            <SprintSelector currentSprint={currentSprint} availableSprints={availableSprints} onSprintChange={handleSprintChange} />

            {currentSprint && canManageSprints && !isKanbanProject && (
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

        <ConfirmationModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={completeSprintConfirmed}
          title="Complete Sprint"
          message={`This sprint has ${incompleteCount} incomplete task(s). Are you sure you want to complete it? Incomplete tasks will be moved to backlog.`}
          confirmText="Complete"
          cancelText="Cancel"
        />
      </div>
    </DndProvider>
  );
};

export default ActiveSprintPage;
