const Task = require('../models/Task');
const Project = require('../models/Project');
const mongoose = require('mongoose');

// Hàm lấy task theo projectId
const getTasksByProjectKey = async (projectKey) => {
  // 1. Tìm project để lấy projectId
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  // 2. Lấy tất cả các task thuộc projectId đó
  const tasks = await Task.find({ projectId: project._id })
    .populate('taskTypeId', 'name icon')
    .populate('priorityId', 'name icon')
    .populate('assigneeId', 'fullname avatar')
    .populate('reporterId', 'fullname avatar')
    .populate('statusId', 'name color')
    .populate('platformId', 'name icon')
    .sort({ createdAt: -1 }); // Sắp xếp theo task mới nhất

  return tasks;
};

// Hàm tạo một task mới
const createTask = async (taskData) => {
  const { projectId } = taskData;

  // Kiểm tra projectId có hợp lệ không
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    const error = new Error('Invalid Project ID');
    error.statusCode = 400;
    throw error;
  }
  
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
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
    .populate('taskTypeId', 'name icon')
    .populate('priorityId', 'name icon')
    .populate('assigneeId', 'fullname avatar')
    .populate('reporterId', 'fullname avatar')
    .populate('sprintId', 'name')
    .populate('statusId', 'name color')
    .populate('platformId', 'name icon');
  return populatedTask;
};

module.exports = {
  getTasksByProjectKey,
  createTask,
};