const Task = require("../models/Task");
const Project = require("../models/Project");
const mongoose = require("mongoose");
const { logAction } = require("./AuditLogHelper");
const { logHistory } = require("./HistoryService");
const TaskHistory = require("../models/TaskHistory");
const notificationService = require("./NotificationService");
const workflowService = require("./WorkflowService");
const User = require("../models/User");
const Workflow = require("../models/Workflow");
const cloudinary = require("../config/cloudinary"); // BẠN CẦN IMPORT CLOUDINARY VÀO ĐÂY
const path = require("path");
const fs = require("fs");
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
  const { projectId, sprintId } = taskData;

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

  // Nếu task được tạo trong sprint và chưa có startDate, lấy startDate từ sprint
  if (sprintId && !taskData.startDate) {
    const Sprint = require("../models/Sprint");
    const sprint = await Sprint.findById(sprintId);
    if (sprint && sprint.startDate) {
      taskData.startDate = sprint.startDate;
    }
  }

  // Tạo key duy nhất cho task, kiểm tra trùng lặp
  let taskCount = await Task.countDocuments({ projectId: taskData.projectId });
  let taskKey = `${project.key.toUpperCase()}-${taskCount + 1}`;

  // Kiểm tra xem key đã tồn tại chưa, nếu có thì tăng số lên
  let existingTask = await Task.findOne({ key: taskKey });
  while (existingTask) {
    taskCount++;
    taskKey = `${project.key.toUpperCase()}-${taskCount + 1}`;
    existingTask = await Task.findOne({ key: taskKey });
  }

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
        taskKey: populatedTask.key,
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
const searchTasks = async (queryParams, user) => {
  const {
    keyword,
    projectId,
    assigneeId,
    reporterId,
    createdById,
    statusId,
    priorityId,
    taskTypeId,
    dueDate_gte,
    dueDate_lte,
    statusCategory,
    projectStatus,
  } = queryParams;

  const query = {};

  if (projectId) query.projectId = projectId;
  if (assigneeId) query.assigneeId = assigneeId;
  if (reporterId) query.reporterId = reporterId;
  if (createdById) query.createdById = createdById;
  if (statusId) query.statusId = statusId;
  if (priorityId) query.priorityId = priorityId;
  if (taskTypeId) query.taskTypeId = taskTypeId;

  // Apply role-based filtering
  if (user && user.role !== "admin") {
    const userId = user._id || user.id;
    const userIdString = userId.toString();

    // Get user's projects - check both members and teams
    const userProjects = await Project.find({
      $or: [{ "members.userId": userId }, { "teams.leaderId": userId }, { "teams.members": userId }],
      isDeleted: false,
    }).lean();

    // Categorize projects by user's role
    const pmProjectIds = [];
    const leaderTeamMemberIds = new Set(); // Use Set to avoid duplicates
    const memberProjectIds = [];

    for (const project of userProjects) {
      // Check role in project.members
      const member = project.members.find((m) => m.userId.toString() === userIdString);
      if (member) {
        if (member.role === "PROJECT_MANAGER") {
          pmProjectIds.push(project._id);
        } else {
          memberProjectIds.push(project._id);
        }
      }

      // Check if user is a team leader and collect team member IDs
      for (const team of project.teams || []) {
        if (team.leaderId && team.leaderId.toString() === userIdString) {
          // Add the leader themselves to the list
          leaderTeamMemberIds.add(userIdString);

          // Leader can see all tasks assigned to their team members
          if (team.members && Array.isArray(team.members)) {
            team.members.forEach((memberId) => {
              // Handle both ObjectId and string formats
              const memberIdString = typeof memberId === "object" && memberId._id ? memberId._id.toString() : memberId.toString();
              leaderTeamMemberIds.add(memberIdString);
            });
          }
        }
      }
    }

    // Build query based on role
    const roleConditions = [];

    // PM: all tasks in projects they manage
    if (pmProjectIds.length > 0) {
      roleConditions.push({ projectId: { $in: pmProjectIds } });
    }

    // LEADER: tasks assigned to team members they lead (including themselves)
    if (leaderTeamMemberIds.size > 0) {
      roleConditions.push({ assigneeId: { $in: Array.from(leaderTeamMemberIds) } });
    }

    // MEMBER: tasks assigned to them (if not already covered by other roles)
    if (pmProjectIds.length === 0 && leaderTeamMemberIds.size === 0) {
      roleConditions.push({ assigneeId: userId });
    }

    // Combine all conditions with $or
    if (roleConditions.length > 0) {
      if (query.$or) {
        // If there's already $or (from keyword search), combine them
        query.$and = [{ $or: query.$or }, { $or: roleConditions }];
        delete query.$or;
      } else {
        query.$or = roleConditions;
      }
    }
  }

  if (dueDate_gte || dueDate_lte) {
    query.dueDate = {};
    if (dueDate_gte) query.dueDate.$gte = new Date(dueDate_gte);
    if (dueDate_lte) {
      const endDate = new Date(dueDate_lte);
      endDate.setDate(endDate.getDate() + 1);
      query.dueDate.$lt = endDate;
    }
  }

  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { key: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
    ];
  }

  const tasks = await Task.find(query)
    .populate("projectId", "name key isDeleted status")
    .populate("taskTypeId", "name icon")
    .populate("priorityId", "name icon")
    .populate("assigneeId", "fullname avatar")
    .populate("reporterId", "fullname avatar")
    .populate("sprintId", "name")
    .populate("platformId", "name icon")
    .populate("createdById", "fullname avatar")
    .populate({
      path: "linkedTasks.taskId",
      select: "key name taskTypeId",
      populate: { path: "taskTypeId", select: "name icon" },
    })
    .sort({ createdAt: -1 })
    .lean(); // Chuyển sang object thường, không phải Mongoose document

  // Filter out tasks from deleted projects and optionally by project status
  let filteredTasks = tasks.filter((task) => task.projectId && task.projectId.isDeleted === false);

  if (projectStatus) {
    filteredTasks = filteredTasks.filter((task) => task.projectId && task.projectId.status === projectStatus);
  }

  if (filteredTasks.length === 0) {
    return [];
  }

  const projectIdsInTasks = [...new Set(filteredTasks.map((task) => task.projectId?._id.toString()).filter(Boolean))];

  const workflows = await Workflow.find({ projectId: { $in: projectIdsInTasks } });

  const workflowMap = new Map(workflows.map((wf) => [wf.projectId.toString(), wf]));

  const populatedTasks = filteredTasks.map((task) => {
    if (!task.projectId || !task.statusId) {
      return task; // Trả về task gốc nếu thiếu dữ liệu
    }

    const workflow = workflowMap.get(task.projectId._id.toString());
    if (workflow && workflow.statuses) {
      const statusObject = workflow.statuses.find((s) => s._id.toString() === task.statusId.toString());

      if (statusObject) {
        task.statusId = statusObject;
      }
    }
    return task;
  });

  // Filter by status category if provided
  let finalTasks = populatedTasks;
  if (statusCategory) {
    const categories = statusCategory.split(",").map((c) => c.trim());
    finalTasks = populatedTasks.filter((task) => {
      if (!task.statusId || !task.statusId.category) return false;
      // Case-insensitive comparison
      return categories.some((cat) => cat.toLowerCase() === task.statusId.category.toLowerCase());
    });
  }

  return finalTasks;
};

const updateTask = async (taskId, updateData, userId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    const error = new Error("Invalid Task ID");
    error.statusCode = 400;
    throw error;
  }

  // Ngăn chặn việc thay đổi reporterId và createdById
  delete updateData.reporterId;
  delete updateData.createdById;

  // 1. Lấy task hiện tại TRƯỜC KHI cập nhật để so sánh
  const originalTask = await Task.findById(taskId).populate("projectId", "_id").populate("statusId", "_id").lean();

  if (!originalTask) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if statusId is being updated to "Done" category, then auto-set progress to 100%
  if (updateData.statusId && originalTask.projectId) {
    const workflow = await Workflow.findOne({ projectId: originalTask.projectId._id });
    if (workflow && workflow.statuses) {
      const newStatus = workflow.statuses.find((s) => s._id.toString() === updateData.statusId.toString());
      if (newStatus && newStatus.category && newStatus.category.toLowerCase() === "done") {
        updateData.progress = 100;
      }
    }
  }

  // 2. Kiểm tra xem task đã Done chưa
  if (originalTask.statusId && originalTask.projectId) {
    const workflow = await Workflow.findOne({ projectId: originalTask.projectId._id });
    if (workflow && workflow.statuses) {
      const currentStatus = workflow.statuses.find((s) => s._id.toString() === originalTask.statusId._id.toString());
      if (currentStatus && currentStatus.category && currentStatus.category.toLowerCase() === "done") {
        const error = new Error("Cannot edit task that is already Done");
        error.statusCode = 403;
        throw error;
      }
    }
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
      path: "linkedTasks.taskId",
      select: "key name taskTypeId",
      populate: { path: "taskTypeId", select: "name icon" },
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
  const updateData = { sprintId: sprintId || null };

  // Nếu add vào sprint (sprintId có giá trị), cập nhật startDate theo sprint
  if (sprintId) {
    const Sprint = require("../models/Sprint");
    const sprint = await Sprint.findById(sprintId);
    if (sprint && sprint.startDate) {
      updateData.startDate = sprint.startDate;
    }
  }

  return updateTask(taskId, updateData, userId);
};

const updateTaskStatus = async (taskId, statusId, userId) => {
  console.log("=== updateTaskStatus called ===");
  console.log("taskId:", taskId);
  console.log("statusId:", statusId);
  console.log("userId:", userId);

  const task = await Task.findById(taskId).populate("projectId");
  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  const projectKey = task.projectId.key;
  const currentStatusId = task.statusId;

  console.log("Current statusId:", currentStatusId);
  console.log("New statusId:", statusId);

  if (currentStatusId.toString() === statusId.toString()) {
    return task;
  }

  const workflow = await workflowService.getWorkflowByProject(projectKey);
  console.log("Workflow transitions:", workflow.transitions);

  const isValidTransition = workflow.transitions.some(
    (t) => t.from.toString() === currentStatusId.toString() && t.to.toString() === statusId.toString()
  );

  console.log("Is valid transition:", isValidTransition);

  if (!isValidTransition) {
    const error = new Error("Invalid status transition according to workflow.");
    error.statusCode = 400;
    throw error;
  }

  // Check if new status is "Done" category, then auto-set progress to 100%
  const newStatus = workflow.statuses.find((s) => s._id.toString() === statusId.toString());
  const updateData = { statusId };

  if (newStatus && newStatus.category === "Done") {
    updateData.progress = 100;
  }

  console.log("Calling updateTask with:", updateData);

  try {
    const result = await updateTask(taskId, updateData, userId);
    console.log("updateTask succeeded");
    return result;
  } catch (error) {
    console.error("updateTask failed:", error);
    throw error;
  }
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
    const error = new Error("Không có file nào được tải lên.");
    error.statusCode = 400;
    throw error;
  }

  const task = await Task.findById(taskId);
  if (!task) {
    // Nếu task không tồn tại, chúng ta nên xóa file vừa upload lên Cloudinary để tránh rác
    await cloudinary.uploader.destroy(file.filename); // file.filename là public_id
    const error = new Error("Không tìm thấy công việc");
    error.statusCode = 404;
    throw error;
  }

  // Logic mới: Sử dụng thông tin từ Cloudinary (req.file)
  const newAttachment = {
    filename: file.originalname, // Tên file gốc
    url: file.path, // URL từ Cloudinary
    public_id: file.filename, // public_id từ Cloudinary
  };

  task.attachments.push(newAttachment);

  const updatedTask = await task.save();

  await logHistory(taskId, userId, "Attachment", null, `Đã thêm tệp đính kèm: ${file.originalname}`, "UPDATE");

  // Dùng lại hàm populate của bạn để trả về dữ liệu đầy đủ
  return populateFullTask(Task.findById(updatedTask._id));
};

const deleteAttachment = async (taskId, attachmentId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(attachmentId)) {
    const error = new Error("ID không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  const task = await Task.findById(taskId);
  if (!task) {
    const error = new Error("Không tìm thấy công việc");
    error.statusCode = 404;
    throw error;
  }

  const attachment = task.attachments.id(attachmentId);
  if (!attachment) {
    const error = new Error("Không tìm thấy tệp đính kèm");
    error.statusCode = 404;
    throw error;
  }

  try {
    await cloudinary.uploader.destroy(attachment.public_id);
  } catch (cloudinaryError) {
    console.error(`Lỗi khi xóa file trên Cloudinary (public_id: ${attachment.public_id}):`, cloudinaryError);
  }

  task.attachments.pull(attachmentId);
  const updatedTask = await task.save();

  await logHistory(taskId, userId, "Attachment", null, `Đã xóa tệp đính kèm: ${attachment.filename}`, "UPDATE");

  return populateFullTask(Task.findById(updatedTask._id));
};

const getOppositeLinkType = (type) => {
  const opposites = {
    blocks: "is blocked by",
    "is blocked by": "blocks",
    clones: "is cloned by",
    "is cloned by": "clones",
    duplicates: "is duplicated by",
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
      path: "linkedTasks.taskId",
      select: "key name taskTypeId",
      populate: { path: "taskTypeId", select: "name icon" },
    },
  ]);
};

const linkTask = async (currentTaskId, targetTaskId, linkType, userId) => {
  if (currentTaskId === targetTaskId) {
    const error = new Error("Cannot link a task to itself.");
    error.statusCode = 400;
    throw error;
  }

  const [currentTask, targetTask] = await Promise.all([Task.findById(currentTaskId), Task.findById(targetTaskId)]);

  if (!currentTask || !targetTask) {
    const error = new Error("One or both tasks not found.");
    error.statusCode = 404;
    throw error;
  }

  const existingLink = currentTask.linkedTasks.find((link) => link.taskId.toString() === targetTaskId);
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
    populateFullTask(Task.findById(targetTaskId)),
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

  const targetTaskKey = targetTask?.key || "unknown task";
  await logHistory(currentTaskId, userId, "Link", null, `Unlinked from ${targetTaskKey}`, "UPDATE");
  if (targetTask) {
    await logHistory(targetTaskId, userId, "Link", null, `Unlinked from ${currentTask.key}`, "UPDATE");
  }

  const [updatedCurrentTask, updatedTargetTask] = await Promise.all([
    populateFullTask(Task.findById(currentTaskId)),
    targetTask ? populateFullTask(Task.findById(targetTaskId)) : Promise.resolve(null),
  ]);

  return [updatedCurrentTask, updatedTargetTask].filter(Boolean);
};
const getTaskByKey = async (taskKey) => {
  const task = await Task.findOne({ key: taskKey.toUpperCase() }).populate([
    // Sao chép phần populate từ hàm updateTask để đảm bảo nhất quán
    { path: "projectId", select: "name key status isDeleted" }, // Thêm status và isDeleted
    { path: "taskTypeId", select: "name icon" },
    { path: "priorityId", select: "name icon" },
    { path: "assigneeId", select: "fullname avatar" },
    { path: "reporterId", select: "fullname avatar" },
    { path: "createdById", select: "fullname avatar" },
    { path: "statusId", select: "name color" },
    { path: "sprintId", select: "name" },
    { path: "platformId", select: "name icon" },
    {
      path: "linkedTasks.taskId",
      select: "key name taskTypeId",
      populate: { path: "taskTypeId", select: "name icon" },
    },
  ]);

  if (!task) {
    const error = new Error("Task not found with that key");
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra xem task có bị xóa không
  if (task.isDeleted) {
    const error = new Error("This task has been deleted and is no longer accessible");
    error.statusCode = 410; // 410 Gone - resource deleted
    throw error;
  }

  // Kiểm tra xem project có bị xóa không
  if (task.projectId && task.projectId.isDeleted) {
    const error = new Error("This task belongs to a deleted project and is no longer accessible");
    error.statusCode = 410;
    throw error;
  }

  // Logic lấy status từ workflow (giống trong searchTasks)
  if (task.projectId && task.statusId) {
    const workflow = await Workflow.findOne({ projectId: task.projectId._id });
    if (workflow && workflow.statuses) {
      const statusObject = workflow.statuses.find((s) => s._id.toString() === task.statusId.toString());
      if (statusObject) {
        // Gán lại statusId thành object đầy đủ từ workflow
        task.statusId = statusObject;
      }
    }
  }

  return task;
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
  getTaskByKey,
};
