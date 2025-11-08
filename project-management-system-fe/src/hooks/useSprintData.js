import { useState, useEffect, useCallback } from "react";
import sprintService from "../services/sprintService";
import workflowService from "../services/workflowService";
import { toast } from "react-toastify";

/**
 * Custom hook for managing sprint data
 * @param {string} effectiveProjectKey - The project key
 * @param {URLSearchParams} searchParams - URL search parameters
 * @returns {Object} Sprint data and methods
 */
export const useSprintData = (effectiveProjectKey, searchParams) => {
  const [currentSprint, setCurrentSprint] = useState(null);
  const [availableSprints, setAvailableSprints] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [workflowStatuses, setWorkflowStatuses] = useState([]);
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);

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
      let workflowData;
      if (effectiveProjectKey) {
        // Get workflow specific to this project
        workflowData = await workflowService.getWorkflowByProject(effectiveProjectKey);
      } else {
        // Fallback to default workflow
        workflowData = await workflowService.getDefaultWorkflow();
      }
      setWorkflow(workflowData);

      // Sort statuses by category order: To Do -> In Progress -> Done
      const categoryOrder = { "To Do": 1, "In Progress": 2, Done: 3 };
      const sortedStatuses = (workflowData.statuses || []).sort((a, b) => {
        const orderA = categoryOrder[a.category] || 999;
        const orderB = categoryOrder[b.category] || 999;
        return orderA - orderB;
      });

      setWorkflowStatuses(sortedStatuses);
    } catch (error) {
      console.error("Error fetching workflow:", error);
      toast.error("Failed to load workflow");
    }
  }, [effectiveProjectKey]);

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

  return {
    currentSprint,
    setCurrentSprint,
    availableSprints,
    tasks,
    setTasks,
    workflowStatuses,
    workflow,
    loading,
    fetchSprintTasks,
  };
};
