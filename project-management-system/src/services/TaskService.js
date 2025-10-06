const Task = require("../models/Task");
const Project = require("../models/Project");
const mongoose = require("mongoose");

// Hàm lấy task theo projectId
const getTasksByProjectKey = async (projectKey) => {
  // 1. Tìm project để lấy projectId
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Lấy tất cả các task thuộc projectId đó
  const tasks = await Task.find({ projectId: project._id })
    .populate("taskTypeId", "name icon")
    .populate("priorityId", "name icon")
    .populate("assigneeId", "fullname avatar")
    .populate("reporterId", "fullname avatar")
    .populate("statusId", "name color")
    .populate("platformId", "name icon")
    .sort({ createdAt: -1 }); // Sắp xếp theo task mới nhất

  return tasks;
};

// Hàm tạo một task mới
const createTask = async (taskData) => {
  const { projectId } = taskData;

  // Kiểm tra projectId có hợp lệ không
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    const error = new Error("Invalid Project ID");
    error.statusCode = 400;
    throw error;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  const taskCount = await Task.countDocuments({ projectId });
  const taskKey = `${project.key.toUpperCase()}-${taskCount + 1}`;

  const newTask = new Task({
    ...taskData,
    key: taskKey,
  });

  const savedTask = await newTask.save();
  const populatedTask = await Task.findById(savedTask._id)
    .populate("taskTypeId", "name icon")
    .populate("priorityId", "name icon")
    .populate("assigneeId", "fullname avatar")
    .populate("reporterId", "fullname avatar")
    .populate("sprintId", "name")
    .populate("statusId", "name color")
    .populate("platformId", "name icon");
  return populatedTask;
};

const changeTaskSprint = async (taskId, sprintId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    const error = new Error("Invalid Task ID");
    error.statusCode = 400;
    throw error;
  }
  if (sprintId && !mongoose.Types.ObjectId.isValid(sprintId)) {
    const error = new Error("Invalid Sprint ID");
    error.statusCode = 400;
    throw error;
  }
  const task = await Task.findById(taskId);
  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }
  task.sprintId = sprintId || null;
  await task.save();
  return task;
};

// Update task status
const updateTaskStatus = async (taskId, statusId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    const error = new Error("Invalid Task ID");
    error.statusCode = 400;
    throw error;
  }
  if (!mongoose.Types.ObjectId.isValid(statusId)) {
    const error = new Error("Invalid Status ID");
    error.statusCode = 400;
    throw error;
  }

  const task = await Task.findById(taskId);
  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  task.statusId = statusId;
  await task.save();

  // Return updated task with populated fields
  const updatedTask = await Task.findById(taskId)
    .populate("taskTypeId", "name icon")
    .populate("priorityId", "name icon")
    .populate("assigneeId", "fullname avatar")
    .populate("reporterId", "fullname avatar")
    .populate("sprintId", "name")
    .populate("platformId", "name icon")
    .lean();

  return updatedTask;
};

module.exports = {
  getTasksByProjectKey,
  createTask,
  changeTaskSprint,
  updateTaskStatus,
};
