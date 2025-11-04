const Task = require("../models/Task");
const Project = require("../models/Project");
const mongoose = require("mongoose");
const { logAction } = require("./AuditLogHelper");

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
const createTask = async (taskData, userId) => {
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

  await logAction({
    userId,
    action: "create_task",
    tableName: "Task",
    recordId: savedTask._id,
    newData: savedTask,
  });

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

const searchTasks = async (queryParams) => {
  const {
    keyword,
    projectId,
    assigneeId,
    reporterId,
    createdById, // Thêm bộ lọc này
    statusId,
    priorityId,
    taskTypeId,
    dueDate_gte, // Lớn hơn hoặc bằng (ngày bắt đầu)
    dueDate_lte, // Nhỏ hơn hoặc bằng (ngày kết thúc)
  } = queryParams;

  const query = {};

  if (projectId) query.projectId = projectId;
  if (assigneeId) query.assigneeId = assigneeId;
  if (reporterId) query.reporterId = reporterId;
  if (createdById) query.createdById = createdById; // Thêm logic
  if (statusId) query.statusId = statusId;
  if (priorityId) query.priorityId = priorityId;
  if (taskTypeId) query.taskTypeId = taskTypeId;

  // Xử lý LỌC THEO KHOẢNG NGÀY
  if (dueDate_gte || dueDate_lte) {
    query.dueDate = {};
    if (dueDate_gte) query.dueDate.$gte = new Date(dueDate_gte);
    if (dueDate_lte) {
      // Thêm 1 ngày để bao gồm cả ngày kết thúc
      const endDate = new Date(dueDate_lte);
      endDate.setDate(endDate.getDate() + 1);
      query.dueDate.$lt = endDate;
    }
  }

  // Xử lý tìm kiếm theo keyword (tìm trong 'name', 'key', 'description')
  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { key: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
    ];
  }

  const tasks = await Task.find(query)
    .populate("projectId", "name key") // Thêm projectId để có thể filter
    .populate("taskTypeId", "name icon")
    .populate("priorityId", "name icon")
    .populate("assigneeId", "fullname avatar")
    .populate("reporterId", "fullname avatar")
    .populate("statusId", "name color")
    .populate("sprintId", "name")
    .populate("platformId", "name icon")
    .populate("createdById", "fullname avatar")
    .sort({ createdAt: -1 });

  return tasks;
};

const updateTask = async (taskId, updateData, userId) => {
  console.log("Type of progress:", typeof updateData.progress);
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    const error = new Error("Invalid Task ID");
    error.statusCode = 400;
    throw error;
  }

  const oldTask = await Task.findById(taskId).lean();
  const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, { new: true });

  if (!updatedTask) {
    const error = new Error("Task not found or update failed");
    error.statusCode = 404;
    throw error;
  }

  // Populate các trường cần thiết trên document đã được cập nhật
  // Mongoose 6+ cho phép populate trực tiếp trên kết quả của findByIdAndUpdate
  await updatedTask.populate([
    { path: "projectId", select: "name key" },
    { path: "taskTypeId", select: "name icon" },
    { path: "priorityId", select: "name icon" },
    { path: "assigneeId", select: "fullname avatar" },
    { path: "reporterId", select: "fullname avatar" },
    { path: "createdById", select: "fullname avatar" },
    { path: "statusId", select: "name color" },
    { path: "sprintId", select: "name" },
    { path: "platformId", select: "name icon" },
  ]);

  await logAction({
    userId,
    action: "update_task",
    tableName: "Task",
    recordId: updatedTask._id,
    oldData: oldTask,
    newData: updatedTask,
  });

  return updatedTask;
};

const deleteTask = async (taskId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    const error = new Error("Invalid Task ID");
    error.statusCode = 400;
    throw error;
  }

  const deletedTask = await Task.findByIdAndDelete(taskId);

  if (!deletedTask) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  await logAction({
    userId,
    action: "delete_task",
    tableName: "Task",
    recordId: deletedTask._id,
    oldData: deletedTask,
  });

  // TODO: Xử lý các logic phụ thuộc nếu cần
  // Ví dụ: xóa các task con, xóa comment, xóa attachment...

  return { message: "Task deleted successfully" };
};

module.exports = {
  getTasksByProjectKey,
  createTask,
  changeTaskSprint,
  updateTaskStatus,
  searchTasks, // Xuất hàm mới
  updateTask,
  deleteTask,
};
