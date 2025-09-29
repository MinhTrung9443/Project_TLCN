const taskService = require('../services/TaskService');
const Workflow = require('../models/Workflow');

const handleGetTasksByProjectKey = async (req, res) => {
  try {
    const { projectKey } = req.params;
    const tasks = await taskService.getTasksByProjectKey(projectKey);
    res.status(200).json(tasks);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Server Error' });
  }
};

const handleCreateTask = async (req, res) => {
  try {
    const reporterId = req.user.id; 
    const createdById = req.user.id;

    const taskData = { ...req.body, reporterId, createdById };

    if (!taskData.statusId) {
      const defaultWorkflow = await Workflow.findOne({ isDefault: true });
      if (!defaultWorkflow) {
        return res.status(400).json({ message: "No default workflow found" });
      }

      const defaultStatus = defaultWorkflow.statuses.find(s => s.category === "To Do");

      if (!defaultStatus) {
        return res.status(400).json({ message: "No default 'To Do' status found in workflow" });
      }

      taskData.statusId = defaultStatus._id;
    }
    const newTask = await taskService.createTask(taskData);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Server Error' });
  }
};

module.exports = {
  handleGetTasksByProjectKey,
  handleCreateTask,
};