import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import _ from "lodash";

import { getProjects } from "../../services/projectService";
import { searchTasks, deleteTask } from "../../services/taskService";
import userService from "../../services/userService"; // Import default object
import statusService from "../../services/workflowService";

import CreateTaskModal from "../../components/task/CreateTaskModal";
import TaskRow from "./TaskRow";
import TaskDetailPanel from "../../components/task/TaskDetailPanel";
import "../../styles/pages/ManageTask/TaskFinderPage.css";

const TaskFinderPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

  const [activeFilters, setActiveFilters] = useState({});

  const [selectedTask, setSelectedTask] = useState(null);

  const [filterData, setFilterData] = useState({
    projects: [],
    users: [],
    statuses: [],
    priorities: [],
    taskTypes: [],
    sprints: [],
  });

  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [projectsRes, statusesRes, usersRes] = await Promise.all([
          getProjects(), // Hàm này có thể đã được export riêng lẻ
          userService.getAllUsers(), // Gọi qua object
          statusService.getStatusList(),
        ]);

        setFilterData({
          projects: projectsRes.data || [],
          users: usersRes.data || [],
          statuses: statusesRes.data || [],
          priorities: [],
          taskTypes: [],
          sprints: [],
        });
      } catch (error) {
        // toast.error("Could not load initial data.");
        // console.error("!!!!!!!!!! [DEBUG] FAILED to fetch initial data. Error:", error); // <-- LOG LỖI
      }
    };
    fetchFilterData();
  }, []);

  const selectOptions = useMemo(
    () => ({
      projects: filterData.projects.map((p) => ({ value: p._id, label: p.name })),
      users: filterData.users.map((u) => ({ value: u._id, label: u.fullname })),
      statuses: filterData.statuses.map((s) => ({ value: s._id, label: s.name })),
      priorities: filterData.priorities.map((p) => ({ value: p._id, label: p.name })),
      taskTypes: filterData.taskTypes.map((t) => ({ value: t._id, label: t.name })),
      sprints: filterData.sprints.map((sp) => ({ value: sp._id, label: sp.name })),
    }),
    [filterData]
  );

  const fetchTasks = async (filters, currentKeyword) => {
    setLoading(true);
    try {
      const params = { ...filters, keyword: currentKeyword };
      const response = await searchTasks(_.pickBy(params, _.identity));
      setTasks(response.data);
    } catch (error) {
      toast.error("Could not fetch tasks.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetch = useCallback(_.debounce(fetchTasks, 500), []);

  useEffect(() => {
    // Chỉ fetch khi keyword thay đổi
    debouncedFetch(activeFilters, keyword);
  }, [keyword, debouncedFetch, activeFilters]); // Thêm activeFilters vào dependency array

  const handleTaskCreated = (newTask) => {
    fetchTasks(activeFilters, keyword);
  };

  const handleTaskUpdate = (updatedTask) => {
    // Cập nhật danh sách task chính
    setTasks((prevTasks) => prevTasks.map((task) => (task._id === updatedTask._id ? updatedTask : task)));
    if (selectedTask && selectedTask._id === updatedTask._id) {
      setSelectedTask(updatedTask);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const closePanel = () => {
    setSelectedTask(null);
  };

  const handleTaskDelete = async (taskId) => {
    try {
      await deleteTask(taskId); // Giả sử bạn có hàm này trong service
      // Xóa task khỏi state để UI cập nhật ngay lập tức
      setTasks((prevTasks) => prevTasks.filter((t) => t._id !== taskId));
      setSelectedTask(null); // Đóng panel sau khi xóa
      toast.success("Task deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete task.");
    }
  };

  const handleTaskClone = (taskId) => {
    console.log("Cloning task with ID:", taskId);
  };

  return (
    <>
      <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onTaskCreated={handleTaskCreated} />
      <div className={`task-finder-wrapper ${selectedTask ? "panel-open" : ""}`}>
        <div className="task-finder-main-content">
          <header className="task-finder-header">
            <h1>Task Finder</h1>
            <button className="create-task-btn" onClick={() => setIsModalOpen(true)}>
              CREATE TASK
            </button>
          </header>

          <div className="filters-container">
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
            {!loading && (
              <div className="task-list-summary">
                Task List / {tasks.length} {tasks.length === 1 ? "Task" : "Tasks"}
              </div>
            )}
            <div className="task-list-header">
              <div className="task-cell task-key">Key</div>
              <div className="task-cell task-name">Name</div>
              <div className="task-cell task-sprint">Sprint</div>
              <div className="task-cell task-platform">Platform</div>
              <div className="task-cell task-assignee">Assignee</div>
              <div className="task-cell task-reporter">Reporter</div>
              <div className="task-cell task-priority">Priority</div>
              <div className="task-cell task-story-points">Story Point</div>
              <div className="task-cell task-status">Status</div>
              <div className="task-cell task-due-date">Due Date</div>
            </div>
            <div className="task-list-body">
              {loading ? (
                <p className="loading-text">Loading tasks...</p>
              ) : tasks.length === 0 ? (
                <p className="info-text">No tasks found.</p>
              ) : (
                tasks.map((task) => <TaskRow key={task._id} task={task} onTaskClick={handleTaskClick} />)
              )}
            </div>
          </div>
        </div>
        <TaskDetailPanel
          key={selectedTask?._id}
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onTaskClone={handleTaskClone}
          statuses={selectOptions.statuses}
          priorities={selectOptions.priorities}
          taskTypes={selectOptions.taskTypes}
          sprints={selectOptions.sprints}
        />
      </div>
    </>
  );
};

export default TaskFinderPage;
