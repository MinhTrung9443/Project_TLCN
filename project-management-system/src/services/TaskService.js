const Task = require("../models/Task");
const Project = require("../models/Project");
const mongoose = require("mongoose");
const { logAction } = require("./AuditLogHelper");
const { logHistory } = require("./HistoryService");
const TaskHistory = require("../models/TaskHistory");
const notificationService = require("./NotificationService");
const User = require("../models/User");
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

  const taskCount = await Task.countDocuments({ projectId: taskData.projectId });
  const taskKey = `${project.key.toUpperCase()}-${taskCount + 1}`;

  const newTask = new Task({
    ...taskData,
    key: taskKey,
    createdById: userId, // Đảm bảo gán người tạo
    reporterId: userId, // Thường người tạo cũng là reporter
  });

  const savedTask = await newTask.save();

  // *** GHI LOG HISTORY CHO HÀNH ĐỘNG TẠO TASK ***
  await logHistory(savedTask._id, userId, "Task", null, savedTask.name, "CREATE");
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

  // Gửi thông báo cho assignee nếu có và khác người tạo
  try {
    if (populatedTask.assigneeId && populatedTask.assigneeId._id.toString() !== userId.toString()) {
      const creator = await User.findById(userId);
      await notificationService.notifyTaskAssigned({
        taskId: populatedTask._id,
        taskName: populatedTask.name,
        assigneeId: populatedTask.assigneeId._id,
        assignerName: creator?.fullname || "Someone",
        projectKey: project.key,
      });
    }
  } catch (notificationError) {
    console.error("Failed to send task created notification:", notificationError);
  }

  return populatedTask;
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
    .populate({
        path: 'linkedTasks.taskId',
        select: 'key name taskTypeId', // Lấy các trường cần thiết
        populate: { // Populate lồng để lấy icon
            path: 'taskTypeId',
            select: 'name icon'
        }
    })
    .sort({ createdAt: -1 });

  return tasks;
};

const updateTask = async (taskId, updateData, userId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    const error = new Error("Invalid Task ID");
    error.statusCode = 400;
    throw error;
  }

  // 1. Lấy task hiện tại TRƯỚC KHI cập nhật để so sánh
  const originalTask = await Task.findById(taskId).lean();
  if (!originalTask) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Cập nhật task (Chức năng cốt lõi)
  const oldTask = await Task.findById(taskId).lean();
  const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, { new: true });

  if (!updatedTask) {
    const error = new Error("Task update failed in database");
    error.statusCode = 404;
    throw error;
  }

  try {
    for (const key in updateData) {
      const oldValue = originalTask[key];
      const newValue = updateData[key];

      if (String(oldValue) !== String(newValue)) {
        await logHistory(taskId, userId, key, oldValue, newValue, "UPDATE");
      }
    }
  } catch (historyError) {

    console.error("--- CRITICAL: Failed to log task history but update was successful ---");
    console.error(historyError);
  }

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
    { 
        path: 'linkedTasks.taskId',
        select: 'key name taskTypeId',
        populate: { path: 'taskTypeId', select: 'name icon' }
    },
  ]);

  await logAction({
    userId,
    action: "update_task",
    tableName: "Task",
    recordId: updatedTask._id,
    oldData: oldTask,
    newData: updatedTask,
  });

  try {
    if (originalTask.assigneeId && originalTask.assigneeId.toString() !== userId.toString()) {
      const changer = await User.findById(userId);
      const changerName = changer?.fullname || "Someone";

      const changedFields = [];
      const fieldNames = {
        name: "name",
        description: "description",
        assigneeId: "assignee",
        priorityId: "priority",
        statusId: "status",
        dueDate: "due date",
        taskTypeId: "type",
        platformId: "platform",
        sprintId: "sprint",
      };

      for (const key in updateData) {
        if (String(originalTask[key]) !== String(updateData[key])) {
          changedFields.push(fieldNames[key] || key);
        }
      }

      if (changedFields.length > 0) {
        const changesText = changedFields.join(", ");
        await notificationService.createAndSend({
          userId: originalTask.assigneeId,
          title: "Task Updated",
          message: `${changerName} updated ${changesText} of "${updatedTask.name}"`,
          type: "task_updated",
          relatedId: updatedTask._id,
          relatedType: "Task",
        });
      }
    }
  } catch (notificationError) {
    console.error("Failed to send task update notification:", notificationError);
  }

  return updatedTask;
};

const changeTaskSprint = async (taskId, sprintId, userId) => {
  return updateTask(taskId, { sprintId: sprintId || null }, userId);
};

const updateTaskStatus = async (taskId, statusId, userId) => {
  return updateTask(taskId, { statusId }, userId);
};

const deleteTask = async (taskId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    const error = new Error("Invalid Task ID");
    error.statusCode = 400;
    throw error;
  }

  const deletedTask = await Task.findById(taskId).populate("assigneeId", "fullname").lean();

  if (!deletedTask) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  // Xóa task
  await Task.findByIdAndDelete(taskId);

  await logAction({
    userId,
    action: "delete_task",
    tableName: "Task",
    recordId: deletedTask._id,
    oldData: deletedTask,
  });

  // Gửi thông báo cho assignee nếu có và khác người xóa
  try {
    if (deletedTask.assigneeId && deletedTask.assigneeId._id.toString() !== userId.toString()) {
      const deleter = await User.findById(userId);
      const deleterName = deleter?.fullname || "Someone";

      await notificationService.createAndSend({
        userId: deletedTask.assigneeId._id,
        title: "Task Deleted",
        message: `${deleterName} deleted the task "${deletedTask.name}"`,
        type: "task_deleted",
        relatedId: null, // Task đã bị xóa nên không có relatedId
        relatedType: "Task",
      });
    }
  } catch (notificationError) {
    console.error("Failed to send task deleted notification:", notificationError);
  }

  // TODO: Xử lý các logic phụ thuộc nếu cần
  // Ví dụ: xóa các task con, xóa comment, xóa attachment...

  return { message: "Task deleted successfully" };
};
const getTaskHistory = async (taskId) => {
  return TaskHistory.find({ taskId: taskId, userId: { $exists: true, $ne: null } })
    .populate("userId", "fullname avatar")
    .sort({ createdAt: -1 });
};

const addAttachment = async (taskId, file, userId) => {
  if (!file) {
    const error = new Error("No file uploaded.");
    error.statusCode = 400;
    throw error;
  }

  const task = await Task.findById(taskId);
  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  // URL để truy cập file từ client
  // Hãy chắc chắn rằng domain và port là chính xác
  // Ví dụ: http://localhost:5000/uploads/filename.ext
  // process.env.SERVER_URL nên được định nghĩa trong file .env
  const fileUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/${file.filename}`;
  
  const newAttachment = {
    filename: file.originalname, // Lưu tên file gốc để hiển thị
    url: fileUrl,
    // uploadedAt sẽ tự động được thêm bởi default value trong schema
  };
  
  // Thêm attachment mới vào mảng
  task.attachments.push(newAttachment);
  
  const updatedTask = await task.save();

  // Ghi lại lịch sử
  await logHistory(
    taskId,
    userId,
    "Attachment",
    null,
    `Added attachment: ${file.originalname}`,
    "UPDATE"
  );
  
  // Populate lại để trả về dữ liệu đầy đủ cho client
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

  return updatedTask;
};
const deleteAttachment = async (taskId, attachmentId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(attachmentId)) {
    const error = new Error("Invalid ID");
    error.statusCode = 400;
    throw error;
  }

  const task = await Task.findById(taskId);
  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  // Tìm attachment trong mảng
  const attachment = task.attachments.id(attachmentId);
  if (!attachment) {
    const error = new Error("Attachment not found");
    error.statusCode = 404;
    throw error;
  }
  
  // 1. Xóa file vật lý khỏi server
  try {
    const url = new URL(attachment.url);
    const filename = path.basename(url.pathname); // Lấy tên file từ URL
    const filePath = path.join(__dirname, '..', 'public', 'uploads', filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // Xóa file
    }
  } catch (fileError) {
    // Ghi log lỗi nhưng không dừng tiến trình, vì việc xóa trong DB quan trọng hơn
    console.error(`Failed to delete physical file for attachment ${attachmentId}:`, fileError);
  }

  task.attachments.pull(attachmentId); // <<< Sửa thành phương thức .pull()
  const updatedTask = await task.save();

  // 3. Ghi lại lịch sử
  await logHistory(
    taskId,
    userId,
    "Attachment",
    null,
    `Removed attachment: ${attachment.filename}`,
    "UPDATE"
  );
  
  // 4. Populate lại và trả về
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

  return updatedTask;
};

const getOppositeLinkType = (type) => {
  const opposites = {
    "blocks": "is blocked by",
    "is blocked by": "blocks",
    "clones": "is cloned by",
    "is cloned by": "clones",
    "duplicates": "is duplicated by",
    "is duplicated by": "duplicates",
    "relates to": "relates to",
  };
  return opposites[type];
};


const populateFullTask = (taskQuery) => {
  return taskQuery.populate([
    { path: "projectId", select: "name key" },
    { path: "taskTypeId", select: "name icon" },
    { path: "priorityId", select: "name icon" },
    { path: "assigneeId", select: "fullname avatar" }, 
    { path: "reporterId", select: "fullname avatar" }, 
    { path: "createdById", select: "fullname avatar" },
    { path: "statusId", select: "name color" },
    { path: "sprintId", select: "name" },
    { path: "platformId", select: "name icon" },
    {
      path: 'linkedTasks.taskId',
      select: 'key name taskTypeId',
      populate: { path: 'taskTypeId', select: 'name icon' }
    }
  ]);
};


const linkTask = async (currentTaskId, targetTaskId, linkType, userId) => {
  if (currentTaskId === targetTaskId) {
    const error = new Error("Cannot link a task to itself.");
    error.statusCode = 400;
    throw error;
  }
  
  const [currentTask, targetTask] = await Promise.all([
    Task.findById(currentTaskId),
    Task.findById(targetTaskId),
  ]);

  if (!currentTask || !targetTask) {
    const error = new Error("One or both tasks not found.");
    error.statusCode = 404;
    throw error;
  }

  const existingLink = currentTask.linkedTasks.find(link => link.taskId.toString() === targetTaskId);
  if (existingLink) {
     const error = new Error("Tasks are already linked.");
     error.statusCode = 409;
     throw error;
  }

  const oppositeType = getOppositeLinkType(linkType);
  if (!oppositeType) {
    const error = new Error("Invalid link type.");
    error.statusCode = 400;
    throw error;
  }
  
  currentTask.linkedTasks.push({ type: linkType, taskId: targetTaskId });
  targetTask.linkedTasks.push({ type: oppositeType, taskId: currentTaskId });

  await Promise.all([currentTask.save(), targetTask.save()]);

  await logHistory(currentTaskId, userId, "Link", null, `Linked as '${linkType}' ${targetTask.key}`, "UPDATE");
  await logHistory(targetTaskId, userId, "Link", null, `Linked as '${oppositeType}' ${currentTask.key}`, "UPDATE");
  
  const [updatedCurrentTask, updatedTargetTask] = await Promise.all([
    populateFullTask(Task.findById(currentTaskId)),
    populateFullTask(Task.findById(targetTaskId))
  ]);

  return [updatedCurrentTask, updatedTargetTask]; 
};


const unlinkTask = async (currentTaskId, linkId, userId) => {
    const currentTask = await Task.findById(currentTaskId);
    if (!currentTask) {
        const error = new Error("Task not found.");
        error.statusCode = 404;
        throw error;
    }

    const linkToRemove = currentTask.linkedTasks.id(linkId);
    if (!linkToRemove) {
        const error = new Error("Link not found.");
        error.statusCode = 404;
        throw error;
    }

    const targetTaskId = linkToRemove.taskId;
    const targetTask = await Task.findById(targetTaskId);

    currentTask.linkedTasks.pull(linkId);

    if (targetTask) {
        targetTask.linkedTasks.pull({ taskId: currentTaskId });
        await targetTask.save();
    }
    
    await currentTask.save();

    const targetTaskKey = targetTask?.key || 'unknown task';
    await logHistory(currentTaskId, userId, "Link", null, `Unlinked from ${targetTaskKey}`, "UPDATE");
    if(targetTask) {
      await logHistory(targetTaskId, userId, "Link", null, `Unlinked from ${currentTask.key}`, "UPDATE");
    }

    const [updatedCurrentTask, updatedTargetTask] = await Promise.all([
        populateFullTask(Task.findById(currentTaskId)),
        targetTask ? populateFullTask(Task.findById(targetTaskId)) : Promise.resolve(null)
    ]);
    
    return [updatedCurrentTask, updatedTargetTask].filter(Boolean); 
};
module.exports = {
  getTasksByProjectKey,
  createTask,
  changeTaskSprint,
  updateTaskStatus,
  searchTasks,
  updateTask,
  deleteTask,
  getTaskHistory,
  addAttachment, 
  deleteAttachment,
  linkTask,    
  unlinkTask, 
};