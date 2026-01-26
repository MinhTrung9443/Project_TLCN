import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import _ from "lodash";
import { useAuth } from "../../contexts/AuthContext";

import { getProjects } from "../../services/projectService";
import { searchTasks, deleteTask } from "../../services/taskService";
import userService from "../../services/userService";
import statusService from "../../services/workflowService";

import CreateTaskModal from "../../components/task/CreateTaskModal";
import TaskRow from "./TaskRow";
import TaskDetailPanel from "../../components/task/TaskDetailPanel";

// New UI Components
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import PageHeader from "../../components/ui/PageHeader";
import FilterBar from "../../components/ui/FilterBar";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { Table, TableHeader, TableBody, TableRow, TableHead } from "../../components/ui/Table";

const TaskFinderPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [includeDone, setIncludeDone] = useState(false);
  const [projectStatus, setProjectStatus] = useState("active"); // Default to active projects only
  const [viewMode, setViewMode] = useState("MY_TASKS"); // MY_TASKS or MANAGED_TASKS (for non-admin users)
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

  // Projects used for the project dropdown depending on view mode
  const [projectsForDropdown, setProjectsForDropdown] = useState([]);
  const [groupedManagedProjects, setGroupedManagedProjects] = useState({ pm: [], leader: [] });

  // Recompute grouped managed projects when project list or user changes
  useEffect(() => {
    if (!user) return;
    const pm = [];
    const leader = [];
    (filterData.projects || []).forEach((p) => {
      const isPM = p.members?.some((m) => (m.userId?._id === user._id || m.userId === user._id) && m.role === "PROJECT_MANAGER");
      const isLeader = p.teams?.some((t) => t.leaderId?._id === user._id || t.leaderId === user._id);
      if (isPM) pm.push({ value: p._id, label: p.name, status: p.status });
      else if (isLeader) leader.push({ value: p._id, label: p.name, status: p.status });
    });
    setGroupedManagedProjects({ pm, leader });
  }, [filterData.projects, user]);

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

  // whether current user manages any project (PM or Team Leader)
  const hasManagedRole = useMemo(() => {
    if (!user) return false;
    if (user.role === "admin") return true;

    return (filterData.projects || []).some((project) => {
      const isPM = project.members?.some(
        (member) => (member.userId?._id === user._id || member.userId === user._id) && member.role === "PROJECT_MANAGER",
      );
      const isLeader = project.teams?.some((team) => team.leaderId?._id === user._id || team.leaderId === user._id);
      return isPM || isLeader;
    });
  }, [user, filterData.projects]);

  // project ids present in current tasks list (helps include projects where user has assigned tasks)
  const userProjectIdsFromTasks = useMemo(() => {
    const set = new Set();
    (tasks || []).forEach((t) => {
      const pid = t.projectId?._id || t.projectId;
      if (pid) set.add(pid.toString());
    });
    return set;
  }, [tasks]);

  const selectOptions = useMemo(
    () => ({
      projects: filterData.projects
        .filter((p) => !projectStatus || p.status === projectStatus) // Filter projects by status
        .filter((p) => {
          if (user?.role === "admin") return true;

          if (viewMode === "MANAGED_TASKS") {
            const isPM = p.members?.some(
              (member) => (member.userId?._id === user._id || member.userId === user._id) && member.role === "PROJECT_MANAGER",
            );
            const isLeader = p.teams?.some((team) => team.leaderId?._id === user._id || team.leaderId === user._id);
            return isPM || isLeader;
          }

          if (viewMode === "MY_TASKS") {
            const isMember = p.members?.some((member) => member.userId?._id === user._id || member.userId === user._id);
            const isLeader = p.teams?.some((team) => team.leaderId?._id === user._id || team.leaderId === user._id);
            const hasTask = userProjectIdsFromTasks.has(p._id?.toString());
            return Boolean(isMember || isLeader || hasTask);
          }

          return true;
        })
        .map((p) => ({ value: p._id, label: p.name, status: p.status })),
      users: filterData.users.map((u) => ({ value: u._id, label: u.fullname })),
      statuses: filterData.statuses.map((s) => ({ value: s._id, label: s.name })),
      priorities: filterData.priorities.map((p) => ({ value: p._id, label: p.name })),
      platforms: filterData.platforms.map((p) => ({ value: p._id, label: p.name })),
      taskTypes: filterData.taskTypes.map((t) => ({ value: t._id, label: t.name })),
      sprints: filterData.sprints.map((sp) => ({ value: sp._id, label: sp.name })),
    }),
    [filterData, projectStatus, viewMode, user, /* include tasks-derived project ids */ userProjectIdsFromTasks],
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
      const tasksRes = response.data || [];
      setTasks(tasksRes);

      // Build projectsForDropdown from returned tasks when in MY_TASKS or MANAGED_TASKS
      try {
        const projectMap = new Map();
        tasksRes.forEach((t) => {
          const p = t.projectId;
          if (p && (p._id || p.id)) {
            const id = p._id?.toString() || p.id?.toString();
            if (!projectMap.has(id)) projectMap.set(id, { value: id, label: p.name, status: p.status });
          }
        });
        const projectsArr = Array.from(projectMap.values());
        if (viewMode === "MY_TASKS") {
          setProjectsForDropdown(projectsArr);
        } else if (viewMode === "MANAGED_TASKS") {
          // For managed view, compute grouped managed projects from full project list
          const pm = [];
          const leader = [];
          (filterData.projects || []).forEach((p) => {
            const isPM = p.members?.some((m) => (m.userId?._id === user?._id || m.userId === user?._id) && m.role === "PROJECT_MANAGER");
            const isLeader = p.teams?.some((t) => t.leaderId?._id === user?._id || t.leaderId === user?._id);
            if (isPM) pm.push({ value: p._id, label: p.name, status: p.status });
            else if (isLeader) leader.push({ value: p._id, label: p.name, status: p.status });
          });
          setGroupedManagedProjects({ pm, leader });
          // If no projects derived from filterData, fallback to projects seen in tasks
          if (pm.length === 0 && leader.length === 0) setProjectsForDropdown(projectsArr);
        }
      } catch (e) {
        // ignore
      }
    } catch (error) {
      toast.error("Could not fetch tasks.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetch = useCallback(_.debounce(fetchTasks, 500), [filterData.projects]);

  useEffect(() => {
    const effectiveFilters = { ...activeFilters };

    // For non-admin users, apply view-mode specific filters
    if (user?.role !== "admin") {
      if (viewMode === "MY_TASKS") {
        effectiveFilters.assigneeId = user._id;
      } else if (viewMode === "MANAGED_TASKS") {
        // Ask backend to restrict to projects the user manages
        effectiveFilters.managedOnly = true;
      }
    }

    debouncedFetch(effectiveFilters, keyword, includeDone, projectStatus);
    setCurrentPage(1); // Reset to page 1 when search or filters change
  }, [keyword, debouncedFetch, activeFilters, includeDone, projectStatus, viewMode, user, filterData.projects]);

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

    // Non-admin can create tasks only when viewing Managed Tasks
    return viewMode === "MANAGED_TASKS";
  }, [user, viewMode]);

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
    <div className="flex h-full bg-neutral-50">
      <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onTaskCreated={handleTaskCreated} />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${selectedTask ? "mr-0" : "mr-6"}`}>
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          {/* Page Header */}
          <PageHeader
            icon="task"
            badge="Task Management"
            title="Task Finder"
            subtitle="Search, filter, and manage tasks across your projects"
            actions={
              canCreateTask && (
                <Button variant="primary" size="lg" icon="add" onClick={() => setIsModalOpen(true)}>
                  Create Task
                </Button>
              )
            }
          />

          {/* Filter Bar */}
          <FilterBar searchValue={keyword} onSearchChange={setKeyword} searchPlaceholder="Search by name, key..." onClear={clearAllFilters}>
            <select
              className="px-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 hover:border-neutral-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent min-w-[180px]"
              value={projectStatus}
              onChange={(e) => setProjectStatus(e.target.value)}
            >
              <option value="">All Project Status</option>
              <option value="active">Active Projects</option>
              <option value="paused">Paused Projects</option>
              <option value="completed">Completed Projects</option>
            </select>

            {user?.role !== "admin" && (
              <select
                className="px-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 hover:border-neutral-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent min-w-[150px]"
                value={viewMode}
                onChange={(e) => {
                  const val = e.target.value;
                  setViewMode(val);
                  setActiveFilters((prev) => ({ ...prev, projectId: undefined }));
                }}
              >
                <option value="MY_TASKS">My Tasks</option>
                {hasManagedRole && <option value="MANAGED_TASKS">Managed Tasks</option>}
              </select>
            )}

            <select
              className="px-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 hover:border-neutral-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent min-w-[200px]"
              value={activeFilters.projectId || ""}
              onChange={(e) => handleFilterChange("projectId", e.target.value)}
            >
              <option value="">All Projects</option>
              {user?.role !== "admin" && viewMode === "MANAGED_TASKS" ? (
                <>
                  {groupedManagedProjects.pm.length > 0 && (
                    <optgroup label="Managed Projects (PM)">
                      {groupedManagedProjects.pm.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {groupedManagedProjects.leader.length > 0 && (
                    <optgroup label="Led Projects">
                      {groupedManagedProjects.leader.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {(() => {
                    const pmIds = new Set((groupedManagedProjects.pm || []).map((p) => p.value?.toString()));
                    const leaderIds = new Set((groupedManagedProjects.leader || []).map((p) => p.value?.toString()));
                    const fallback = (projectsForDropdown || []).filter((opt) => {
                      const id = opt.value?.toString();
                      return !pmIds.has(id) && !leaderIds.has(id);
                    });
                    return fallback.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ));
                  })()}
                </>
              ) : (
                (projectsForDropdown.length > 0 ? projectsForDropdown : selectOptions.projects).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              )}
            </select>

            {viewMode !== "MY_TASKS" && (
              <select
                className="px-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 hover:border-neutral-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent min-w-[160px]"
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
            )}

            <select
              className="px-4 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900 hover:border-neutral-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent min-w-[160px]"
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

            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg hover:border-neutral-400 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={includeDone}
                onChange={(e) => setIncludeDone(e.target.checked)}
                className="w-4 h-4 rounded accent-primary-600"
              />
              <span className="font-medium text-neutral-700">Include Done</span>
            </label>
          </FilterBar>

          {/* Table Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center w-full h-full">
                <LoadingSpinner size="lg" text="Loading tasks..." />
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState icon="inbox" title="No tasks found" description="Try adjusting your filters or search criteria" />
            ) : (
              <div className="flex-1 overflow-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow hoverable={false}>
                      <TableHead>Key</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Sprint</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPaginatedTasks().map((task) => (
                      <TaskRow key={task._id} task={task} onTaskClick={handleTaskClick} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && getTotalPages() > 1 && (
            <div className="flex items-center justify-center gap-4 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                icon="chevron_left"
                iconPosition="left"
              >
                Previous
              </Button>
              <span className="text-sm font-medium text-neutral-700 px-4">
                Page {currentPage} of {getTotalPages()}
              </span>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setCurrentPage((prev) => Math.min(getTotalPages(), prev + 1))}
                disabled={currentPage === getTotalPages()}
                icon="chevron_right"
                iconPosition="right"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Panel */}
      {selectedTask && (
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
      )}
    </div>
  );
};

export default TaskFinderPage;
