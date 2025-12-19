import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import _ from "lodash";
import { useAuth } from "../../contexts/AuthContext";

import { getProjects } from "../../services/projectService";
import { searchTasks, deleteTask } from "../../services/taskService";
import userService from "../../services/userService"; // Import default object
import statusService from "../../services/workflowService";

import CreateTaskModal from "../../components/task/CreateTaskModal";
import TaskRow from "./TaskRow";
import TaskDetailPanel from "../../components/task/TaskDetailPanel";
import "../../styles/pages/ManageTask/TaskFinderPage.css";

const TaskFinderPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [includeDone, setIncludeDone] = useState(false);
  const [projectStatus, setProjectStatus] = useState("active"); // Default to active projects only
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [activeFilters, setActiveFilters] = useState({});

  const [selectedTask, setSelectedTask] = useState(null);

  const [filterData, setFilterData] = useState({
    projects: [],
    users: [],
    statuses: [],
    priorities: [],
    platforms: [],
    taskTypes: [],
    sprints: [],
  });

  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [projectsRes, usersRes, statusesRes] = await Promise.all([
          getProjects(),
          userService.getUsers({ status: "active" }), // Get only active users
          statusService.getStatusList(),
        ]);

        console.log("Users response:", usersRes); // Debug log

        setFilterData({
          projects: projectsRes.data || [],
          users: Array.isArray(usersRes) ? usersRes : usersRes.data || [], // Backend returns array directly
          statuses: statusesRes.data || [],
          priorities: [],
          platforms: [],
          taskTypes: [],
          sprints: [],
        });
      } catch (error) {
        console.error("Error fetching filter data:", error);
      }
    };
    fetchFilterData();
  }, []);

  const selectOptions = useMemo(
    () => ({
      projects: filterData.projects
        .filter((p) => !projectStatus || p.status === projectStatus) // Filter projects by status
        .map((p) => ({ value: p._id, label: p.name, status: p.status })),
      users: filterData.users.map((u) => ({ value: u._id, label: u.fullname })),
      statuses: filterData.statuses.map((s) => ({ value: s._id, label: s.name })),
      priorities: filterData.priorities.map((p) => ({ value: p._id, label: p.name })),
      platforms: filterData.platforms.map((p) => ({ value: p._id, label: p.name })),
      taskTypes: filterData.taskTypes.map((t) => ({ value: t._id, label: t.name })),
      sprints: filterData.sprints.map((sp) => ({ value: sp._id, label: sp.name })),
    }),
    [filterData, projectStatus]
  );

  const fetchTasks = async (filters, currentKeyword, showDone, projStatus) => {
    setLoading(true);
    try {
      // Add statusCategory filter - include Done if checkbox is checked
      const categories = showDone ? "To Do,In Progress,Done" : "To Do,In Progress";

      // Filter to get project IDs based on status
      const filteredProjectIds = projStatus
        ? filterData.projects.filter((p) => p.status === projStatus).map((p) => p._id)
        : filterData.projects.map((p) => p._id);

      const params = {
        ...filters,
        keyword: currentKeyword,
        statusCategory: categories,
        projectStatus: projStatus || undefined, // Pass project status to backend
      };

      const response = await searchTasks(_.pickBy(params, _.identity));
      setTasks(response.data);
    } catch (error) {
      toast.error("Could not fetch tasks.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetch = useCallback(_.debounce(fetchTasks, 500), [filterData.projects]);

  useEffect(() => {
    debouncedFetch(activeFilters, keyword, includeDone, projectStatus);
    setCurrentPage(1); // Reset to page 1 when search or filters change
  }, [keyword, debouncedFetch, activeFilters, includeDone, projectStatus]); // Thêm activeFilters vào dependency array

  const handleTaskCreated = (newTask) => {
    fetchTasks(activeFilters, keyword, includeDone, projectStatus);
  };

  const handleTaskUpdate = (updatedData) => {
    setTasks((prevTasks) => {
      if (Array.isArray(updatedData)) {
        const updatesMap = new Map(updatedData.map((task) => [task._id, task]));

        return prevTasks.map((task) => updatesMap.get(task._id) || task);
      } else if (updatedData && updatedData._id) {
        return prevTasks.map((task) => (task._id === updatedData._id ? updatedData : task));
      }

      return prevTasks;
    });

    if (selectedTask) {
      if (Array.isArray(updatedData)) {
        const newlySelectedTask = updatedData.find((t) => t._id === selectedTask._id);
        if (newlySelectedTask) {
          setSelectedTask(newlySelectedTask);
        }
      } else if (updatedData && selectedTask._id === updatedData._id) {
        setSelectedTask(updatedData);
      }
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const closePanel = () => {
    setSelectedTask(null);
  };

  const handleTaskDelete = async (taskId) => {
    const projectKey = selectedTask?.projectId?.key;

    try {
      await deleteTask(projectKey, taskId); // Giả sử bạn có hàm này trong service
      setTasks((prevTasks) => prevTasks.filter((t) => t._id !== taskId));
      setSelectedTask(null); // Đóng panel sau khi xóa
      toast.success("Task deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete task.");
    }
  };

  // Check if user can create tasks
  const canCreateTask = useMemo(() => {
    if (!user) return false;
    if (user.role === "admin") return true;

    // Check if user is PM or Leader in any project
    return filterData.projects.some((project) => {
      // Check if PM
      const isPM = project.members?.some(
        (member) => (member.userId._id === user._id || member.userId === user._id) && member.role === "PROJECT_MANAGER"
      );

      // Check if Leader
      const isLeader = project.teams?.some((team) => team.leaderId._id === user._id || team.leaderId === user._id);

      return isPM || isLeader;
    });
  }, [user, filterData.projects]);

  const handleFilterChange = (filterName, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterName]: value || undefined, // Remove filter if empty
    }));
  };

  const clearAllFilters = () => {
    setActiveFilters({});
  };

  const getPaginatedTasks = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return tasks.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(tasks.length / itemsPerPage);
  };

  return (
    <>
      <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onTaskCreated={handleTaskCreated} />
      <div className={`task-finder-wrapper ${selectedTask ? "panel-open" : ""}`}>
        <div className="task-finder-main-content">
          <header className="task-finder-header">
            <h1>Task Finder</h1>
            {canCreateTask && (
              <button className="create-task-btn" onClick={() => setIsModalOpen(true)}>
                CREATE TASK
              </button>
            )}
          </header>

          <div className="filters-container">
            <div className="filter-dropdowns">
              <select className="filter-select" value={projectStatus} onChange={(e) => setProjectStatus(e.target.value)}>
                <option value="">All Project Status</option>
                <option value="active">Active Projects</option>
                <option value="paused">Paused Projects</option>
                <option value="completed">Completed Projects</option>
              </select>

              <select
                className="filter-select"
                value={activeFilters.projectId || ""}
                onChange={(e) => handleFilterChange("projectId", e.target.value)}
              >
                <option value="">All Projects</option>
                {selectOptions.projects.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={activeFilters.assigneeId || ""}
                onChange={(e) => handleFilterChange("assigneeId", e.target.value)}
              >
                <option value="">All Assignees</option>
                {selectOptions.users.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={activeFilters.reporterId || ""}
                onChange={(e) => handleFilterChange("reporterId", e.target.value)}
              >
                <option value="">All Reporters</option>
                {selectOptions.users.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button className="btn-clear-filters" onClick={clearAllFilters} title="Clear Filters">
                <span className="material-symbols-outlined">filter_alt_off</span>
              </button>

              <label className="include-done-checkbox">
                <input type="checkbox" checked={includeDone} onChange={(e) => setIncludeDone(e.target.checked)} />
                <span>Include Done tasks</span>
              </label>
            </div>

            <div className="right-side-filters">
              <input
                type="text"
                placeholder="Search by name, key..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="keyword-search-input"
              />
            </div>
          </div>

          <div className="task-list-container">
            <div className="task-list-header">
              <div className="task-cell task-key">Key</div>
              <div className="task-cell task-name">Name</div>
              <div className="task-cell task-sprint">Sprint</div>
              <div className="task-cell task-platform">Platform</div>
              <div className="task-cell task-assignee">Assignee</div>
              <div className="task-cell task-reporter">Reporter</div>
              <div className="task-cell task-priority">Priority</div>
              <div className="task-cell task-status">Status</div>
              <div className="task-cell task-due-date">Due Date</div>
            </div>
            <div className="task-list-body">
              {loading ? (
                <p className="loading-text">Loading tasks...</p>
              ) : tasks.length === 0 ? (
                <p className="info-text">No tasks found.</p>
              ) : (
                getPaginatedTasks().map((task) => <TaskRow key={task._id} task={task} onTaskClick={handleTaskClick} />)
              )}
            </div>
          </div>
          {!loading && getTotalPages() > 1 && (
            <div className="pagination-container">
              <button className="pagination-btn" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                Previous
              </button>
              <div className="pagination-info">
                Page {currentPage} of {getTotalPages()}
              </div>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage((prev) => Math.min(getTotalPages(), prev + 1))}
                disabled={currentPage === getTotalPages()}
              >
                Next
              </button>
            </div>
          )}
        </div>
        <TaskDetailPanel
          key={selectedTask?._id}
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          statuses={selectOptions.statuses}
          platforms={selectOptions.platforms}
          priorities={selectOptions.priorities}
          taskTypes={selectOptions.taskTypes}
          sprints={selectOptions.sprints}
        />
      </div>
    </>
  );
};

export default TaskFinderPage;
