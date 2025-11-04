const taskService = require("../services/TaskService");
const Workflow = require("../models/Workflow");

const handleGetTasksByProjectKey = async (req, res) => {
  try {
    const { projectKey } = req.params;
    const tasks = await taskService.getTasksByProjectKey(projectKey);
    res.status(200).json(tasks);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleCreateTask = async (req, res) => {
  try {
    const reporterId = req.user.id;
    const createdById = req.user.id;
    const userId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;
    const taskData = { ...req.body, reporterId, createdById };
    if (!taskData.statusId) {
      const defaultWorkflow = await Workflow.findOne({ isDefault: true });
      if (!defaultWorkflow) {
        return res.status(400).json({ message: "No default workflow found" });
      }
      const defaultStatus = defaultWorkflow.statuses.find((s) => s.category === "To Do");
      if (!defaultStatus) {
        return res.status(400).json({ message: "No default 'To Do' status found in workflow" });
      }
      taskData.statusId = defaultStatus._id;
    }
    const newTask = await taskService.createTask(taskData, userId);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const changeSprint = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { sprintId } = req.body;
    const updatedTask = await taskService.changeTaskSprint(taskId, sprintId);
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleUpdateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { statusId } = req.body;
    const updatedTask = await taskService.updateTaskStatus(taskId, statusId);
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleSearchTasks = async (req, res) => {
  try {
    const tasks = await taskService.searchTasks(req.query);
    res.status(200).json(tasks);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleUpdateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;
    const updatedTask = await taskService.updateTask(id, req.body, userId);
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleDeleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;
    await taskService.deleteTask(id, userId);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

module.exports = {
  handleGetTasksByProjectKey,
  handleCreateTask,
  changeSprint,
  handleUpdateTaskStatus,
  handleSearchTasks,
  handleUpdateTask,
  handleDeleteTask,
};
