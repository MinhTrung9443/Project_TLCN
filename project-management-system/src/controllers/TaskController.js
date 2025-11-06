
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
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.id;
    const taskData = { ...req.body, reporterId: userId, createdById: userId };

    if (!taskData.statusId) {
      const defaultWorkflow = await Workflow.findOne({ projectId: taskData.projectId });
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
    console.error("Error in handleCreateTask:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const changeSprint = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { sprintId } = req.body;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const updatedTask = await taskService.changeTaskSprint(taskId, sprintId, req.user.id);
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleUpdateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { statusId } = req.body;
     if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const updatedTask = await taskService.updateTaskStatus(taskId, statusId, req.user.id);
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
    const { taskId } = req.params;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: User not found." });
    }
    const userId = req.user.id;
    const updatedTask = await taskService.updateTask(taskId, req.body, userId);
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error in handleUpdateTask:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleDeleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    await taskService.deleteTask(taskId);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleGetTaskHistory = async (req, res) => {
  try {
    const { taskId } = req.params; 

    const history = await taskService.getTaskHistory(taskId); 
    
    res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching task history:", error);
    res.status(error.statusCode || 500).json({ message: error.message });
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
  handleGetTaskHistory,
};