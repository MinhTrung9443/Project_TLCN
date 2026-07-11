const Task = require("../models/Task");
const Project = require("../models/Project");
const Priority = require("../models/Priority");
const TaskType = require("../models/TaskType");
const Platform = require("../models/Platform");
const Sprint = require("../models/Sprint");
const mongoose = require("mongoose");
const { logAction } = require("./AuditLogHelper");
const { logHistory } = require("./HistoryService");
const TaskHistory = require("../models/TaskHistory");
const notificationService = require("./NotificationService");
const workflowService = require("./WorkflowService");
const User = require("../models/User");
const Workflow = require("../models/Workflow");
const cloudinary = require("../config/cloudinary");
const path = require("path");
const fs = require("fs");
const ProjectDocument = require("../models/ProjectDocument");
const { normalizeProjectStatus, getUserTaskAccessContext, assertTaskAccessByKey } = require("../utils/taskPermission");
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
    .populate({
      path: "parentTaskId",
      select: "key name taskTypeId",
    })
    .sort({ createdAt: -1 }); // Sắp xếp theo task mới nhất

  return tasks;
};

// Helper function to update parent task (Epic) progress
const updateParentTaskProgress = async (parentTaskId) => {
  if (!parentTaskId) return;

  const parentTask = await Task.findById(parentTaskId);
  if (!parentTask) return;

  const childTasks = await Task.find({ parentTaskId });
  if (childTasks.length === 0) {
    if (parentTask.progress !== 0) {
      parentTask.progress = 0;
      await parentTask.save();
    }
    return;
  }

  const workflow = await Workflow.findOne({ projectId: parentTask.projectId });
  let doneStatuses = [];
  if (workflow && workflow.statuses) {
    doneStatuses = workflow.statuses.filter(s => s.category === "Done").map(s => s._id.toString());
  }

  let totalProgress = 0;
  childTasks.forEach(child => {
    const isDone = child.statusId && doneStatuses.includes(child.statusId.toString());
    if (isDone) {
      totalProgress += 100;
    } else {
      totalProgress += (child.progress || 0);
    }
  });

  const averageProgress = Math.round(totalProgress / childTasks.length);

  if (parentTask.progress !== averageProgress) {
    parentTask.progress = averageProgress;
    await parentTask.save();
    
    try {
      await logHistory(parentTaskId, parentTask.createdById, "Task", "progress", "progress updated automatically from sub-tasks", "UPDATE");
    } catch (e) {
      console.error("Failed to log auto progress update", e);
    }
  }
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

  if (project.status === "completed") {
    const error = new Error("Cannot create tasks in a completed project");
    error.statusCode = 403;
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

  // Update parent task progress if this is a sub-task
  if (savedTask.parentTaskId) {
    await updateParentTaskProgress(savedTask.parentTaskId);
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
    managedOnly,
  } = queryParams;

  const normalizedProjectStatus = normalizeProjectStatus(projectStatus);
  const isManagedOnly = managedOnly === true || managedOnly === "true";
  const query = {};
  const andConditions = [];

  if (statusId) query.statusId = statusId;
  if (priorityId) query.priorityId = priorityId;
  if (taskTypeId) query.taskTypeId = taskTypeId;

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
    andConditions.push({
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { key: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ],
    });
  }

  if (assigneeId) query.assigneeId = assigneeId;
  if (reporterId) query.reporterId = reporterId;
  if (createdById) query.createdById = createdById;

  if (user && user.role !== "admin") {
    const userId = user._id || user.id;
    const accessContext = await getUserTaskAccessContext(user, { projectStatus: normalizedProjectStatus });
    const allowedProjectIds = accessContext.allowedProjectIds;
    const managedProjectIds = accessContext.managedProjectIds;

    // Get TaskType IDs for Epics and Stories so everyone can see them
    const epicStoryTypes = await TaskType.find({ name: { $in: [/^Epic$/i, /^Story$/i] } }).select('_id');
    const epicStoryTypeIds = epicStoryTypes.map(t => t._id);

    let targetProjectIds = allowedProjectIds;
    if (isManagedOnly) {
      targetProjectIds = managedProjectIds;
    }

    if (projectId) {
      const pIdStr = projectId.toString();
      if (!targetProjectIds.includes(pIdStr)) {
        return [];
      }
      query.projectId = projectId;

      const role = accessContext.projectRoleMap.get(pIdStr);
      if (role === "PROJECT_MANAGER") {
        // PM sees all tasks in the project. Explicit filters are handled by query.* properties above.
      } else if (role === "LEADER") {
        const leaderCond = [
          { assigneeId: userId },
          { reporterId: userId },
          { createdById: userId },
          { taskTypeId: { $in: epicStoryTypeIds } }
        ];
        if (accessContext.managedMemberIds && accessContext.managedMemberIds.length > 0) {
          leaderCond.push({ assigneeId: { $in: accessContext.managedMemberIds } });
        }
        andConditions.push({ $or: leaderCond });
      } else {
        andConditions.push({
          $or: [
            { assigneeId: userId }, 
            { reporterId: userId }, 
            { createdById: userId },
            { taskTypeId: { $in: epicStoryTypeIds } }
          ]
        });
      }
    } else {
      if (targetProjectIds.length === 0) return [];

      const roleConditions = [];
      const pmProjectIds = [];
      const leaderProjectIds = [];
      const memberProjectIds = [];

      for (const pId of targetProjectIds) {
        const role = accessContext.projectRoleMap.get(pId);
        if (role === "PROJECT_MANAGER") {
          pmProjectIds.push(pId);
        } else if (role === "LEADER") {
          leaderProjectIds.push(pId);
        } else {
          memberProjectIds.push(pId);
        }
      }

      if (pmProjectIds.length > 0) {
        roleConditions.push({ projectId: { $in: pmProjectIds } });
      }

      if (leaderProjectIds.length > 0) {
        const leaderCond = [
          { assigneeId: userId },
          { reporterId: userId },
          { createdById: userId },
          { taskTypeId: { $in: epicStoryTypeIds } }
        ];
        if (accessContext.managedMemberIds && accessContext.managedMemberIds.length > 0) {
          leaderCond.push({ assigneeId: { $in: accessContext.managedMemberIds } });
        }
        roleConditions.push({
          projectId: { $in: leaderProjectIds },
          $or: leaderCond
        });
      }

      if (memberProjectIds.length > 0) {
        roleConditions.push({
          projectId: { $in: memberProjectIds },
          $or: [
            { assigneeId: userId }, 
            { reporterId: userId }, 
            { createdById: userId },
            { taskTypeId: { $in: epicStoryTypeIds } }
          ]
        });
      }

      if (roleConditions.length > 0) {
        andConditions.push({ $or: roleConditions });
      } else {
        return [];
      }
    }
  } else if (projectId) {
    query.projectId = projectId;
  }

  if (andConditions.length > 0) {
    query.$and = [...(query.$and || []), ...andConditions];
  }

  const tasks = await Task.find(query)
    .populate({
      path: "projectId",
      select: "name key isDeleted status members",
      populate: { path: "members.userId", select: "_id fullname username email avatar status role" },
    })
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
    .populate({
      path: "parentTaskId",
      select: "key name taskTypeId",
    })
    .sort({ createdAt: -1 })
    .lean(); // Chuyển sang object thường, không phải Mongoose document

  // Filter out tasks from deleted projects and enforce active-by-default project status on the populated project
  let filteredTasks = tasks.filter((task) => task.projectId && task.projectId.isDeleted === false);

  if (normalizedProjectStatus !== "any") {
    filteredTasks = filteredTasks.filter((task) => task.projectId && task.projectId.status === normalizedProjectStatus);
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

  // Check if assigneeId or estimatedTime is being changed - only admin, PM, or LEADER can change
  if (
    (updateData.assigneeId !== undefined && updateData.assigneeId !== originalTask.assigneeId?.toString()) ||
    (updateData.estimatedTime !== undefined && updateData.estimatedTime !== originalTask.estimatedTime)
  ) {
    const project = await Project.findById(originalTask.projectId._id);
    const user = await User.findById(userId);

    if (user.role !== "admin") {
      const member = project.members.find((m) => m.userId.toString() === userId);
      const isPM = member && member.role === "PROJECT_MANAGER";
      const isLeader = project.teams.some((team) => team.leaderId.toString() === userId);
      if (!isPM && !isLeader) {
        const error = new Error("Forbidden: Only Project Manager or Team Leader can change assignee or estimated time");
        error.statusCode = 403;
        throw error;
      }
    }
  }

  // Validate dates if startDate or dueDate is being updated
  if (updateData.startDate !== undefined || updateData.dueDate !== undefined) {
    const project = await Project.findById(originalTask.projectId._id);
    if (!project) {
      const error = new Error("Project not found");
      error.statusCode = 404;
      throw error;
    }

    // Use new values if provided, otherwise keep original
    const newStartDate = updateData.startDate !== undefined ? updateData.startDate : originalTask.startDate;
    const newDueDate = updateData.dueDate !== undefined ? updateData.dueDate : originalTask.dueDate;

    const getLocalDateStr = (dateVal) => {
      if (!dateVal) return "";
      if (typeof dateVal === 'string' && dateVal.length === 10 && dateVal.includes('-')) return dateVal;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const startStr = getLocalDateStr(newStartDate);
    const dueStr = getLocalDateStr(newDueDate);
    const projStartStr = getLocalDateStr(project.startDate);
    const projEndStr = getLocalDateStr(project.endDate);

    // Validate startDate <= dueDate if both exist
    if (startStr && dueStr && startStr > dueStr) {
      const error = new Error("Start date must be before or equal to due date");
      error.statusCode = 400;
      throw error;
    }

    // Validate startDate with project dates
    if (startStr) {
      if (projStartStr && startStr < projStartStr) {
        const error = new Error("Task start date cannot be before project start date");
        error.statusCode = 400;
        throw error;
      }
      if (projEndStr && startStr > projEndStr) {
        const error = new Error("Task start date cannot be after project end date");
        error.statusCode = 400;
        throw error;
      }
    }

    // Validate dueDate with project dates
    if (dueStr) {
      if (projStartStr && dueStr < projStartStr) {
        const error = new Error("Task due date cannot be before project start date");
        error.statusCode = 400;
        throw error;
      }
      if (projEndStr && dueStr > projEndStr) {
        const error = new Error("Task due date cannot be after project end date");
        error.statusCode = 400;
        throw error;
      }
    }

    // If task has a sprint, validate dates with sprint dates
    if (originalTask.sprintId) {
      const Sprint = require("../models/Sprint");
      const sprint = await Sprint.findById(originalTask.sprintId);
      if (sprint) {
        const sprintStartStr = getLocalDateStr(sprint.startDate);
        const sprintEndStr = getLocalDateStr(sprint.endDate);

        if (startStr) {
          if (sprintStartStr && startStr < sprintStartStr) {
            const error = new Error("Task start date cannot be before sprint start date");
            error.statusCode = 400;
            throw error;
          }
          if (sprintEndStr && startStr > sprintEndStr) {
            const error = new Error("Task start date cannot be after sprint end date");
            error.statusCode = 400;
            throw error;
          }
        }

        if (dueStr) {
          if (sprintStartStr && dueStr < sprintStartStr) {
            const error = new Error("Task due date cannot be before sprint start date");
            error.statusCode = 400;
            throw error;
          }
          if (sprintEndStr && dueStr > sprintEndStr) {
            const error = new Error("Task due date cannot be after sprint end date");
            error.statusCode = 400;
            throw error;
          }
        }
      }
    }
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

  // Re-fetch the updated task as a plain object with all fields populated, using .lean()
  let populatedTask = await Task.findById(updatedTask._id)
    .populate({ path: "projectId", select: "name key" })
    .populate({ path: "taskTypeId", select: "name icon" })
    .populate({ path: "priorityId", select: "name icon" })
    .populate({ path: "assigneeId", select: "fullname avatar" })
    .populate({ path: "reporterId", select: "fullname avatar" })
    .populate({ path: "createdById", select: "fullname avatar" })
    .populate({ path: "statusId", select: "name color" })
    .populate({ path: "sprintId", select: "name" })
    .populate({ path: "platformId", select: "name icon" })
    .populate({
      path: "linkedTasks.taskId",
      select: "key name taskTypeId",
      populate: { path: "taskTypeId", select: "name icon" },
    })
    .lean();

  // Ensure statusId is a full object from workflow (with name, category, ...)
  if (populatedTask && populatedTask.projectId && populatedTask.statusId) {
    let projectIdObj = populatedTask.projectId;
    if (typeof projectIdObj === "string" || projectIdObj instanceof mongoose.Types.ObjectId) {
      projectIdObj = await Project.findById(populatedTask.projectId);
    }
    const workflow = await Workflow.findOne({ projectId: projectIdObj._id });
    if (workflow && workflow.statuses) {
      const statusObject = workflow.statuses.find(
        (s) => s._id.toString() === populatedTask.statusId._id?.toString() || s._id.toString() === populatedTask.statusId.toString(),
      );
      if (statusObject) {
        populatedTask.statusId = statusObject;
      }
    }
  }

  await logAction({
    userId,
    action: "update_task",
    tableName: "Task",
    recordId: updatedTask._id,
    oldData: oldTask,
    newData: updatedTask,
  });

  try {
    const changer = await User.findById(userId);
    const changerName = changer?.fullname || "Someone";

    const oldAssigneeId = originalTask.assigneeId?.toString?.() || null;
    const newAssigneeId = updateData.assigneeId?.toString?.() || null;

    if (newAssigneeId && newAssigneeId !== oldAssigneeId && newAssigneeId !== userId.toString()) {
      await notificationService.notifyTaskAssigned({
        taskId: updatedTask._id,
        taskKey: updatedTask.key,
        taskName: updatedTask.name,
        assigneeId: newAssigneeId,
        assignerName: changerName,
        projectKey: populatedTask?.projectId?.key || "",
      });
    }

    if (originalTask.assigneeId && originalTask.assigneeId.toString() !== userId.toString()) {
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
          relatedId: updatedTask.key || updatedTask._id,
          relatedType: "Task",
          actorId: userId,
          actorName: changerName,
          metadata: { taskName: updatedTask.name, changedFields },
          enableGrouping: true,
        });
      }
    }
  } catch (notificationError) {
    console.error("Failed to send task update notification:", notificationError);
  }

  // --- Ensure statusId is a full object (with name, category, etc.) ---
  if (updatedTask && updatedTask.projectId && updatedTask.statusId) {
    // Populate projectId if not populated
    let projectIdObj = updatedTask.projectId;
    if (typeof projectIdObj === "string" || projectIdObj instanceof mongoose.Types.ObjectId) {
      projectIdObj = await Project.findById(updatedTask.projectId);
    }
    const workflow = await Workflow.findOne({ projectId: projectIdObj._id });
    if (workflow && workflow.statuses) {
      const statusObject = workflow.statuses.find((s) => s._id.toString() === updatedTask.statusId.toString());
      if (statusObject) {
        updatedTask.statusId = statusObject;
      }
    }
  }

  // Update parent progress if status, progress, or parentTaskId changed
  const progressChanged = originalTask.progress !== updatedTask.progress;
  const statusChanged = originalTask.statusId?.toString() !== updatedTask.statusId?._id?.toString();
  const parentChanged = originalTask.parentTaskId?.toString() !== updatedTask.parentTaskId?.toString();
  
  if (progressChanged || statusChanged || parentChanged) {
    if (updatedTask.parentTaskId) {
      await updateParentTaskProgress(updatedTask.parentTaskId);
    }
    // If parent changed, also update old parent
    if (parentChanged && originalTask.parentTaskId) {
      await updateParentTaskProgress(originalTask.parentTaskId);
    }
  }

  return populatedTask;
};

const changeTaskSprint = async (taskId, sprintId, userId) => {
  const updateData = { sprintId: sprintId || null };

  // Lấy task và project
  const task = await Task.findById(taskId).populate("projectId");
  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }
  const project = task.projectId;
  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }
  if (project.status === "completed") {
    const error = new Error("Cannot change sprint for tasks in a completed project");
    error.statusCode = 403;
    throw error;
  }

  // Nếu add vào sprint (sprintId có giá trị), cập nhật startDate theo sprint
  let sprint = null;
  if (sprintId) {
    const Sprint = require("../models/Sprint");
    sprint = await Sprint.findById(sprintId);

    // Chỉ set startDate từ sprint nếu task chưa có startDate VÀ sprint startDate hợp lệ với project
    if (sprint && sprint.startDate && !task.startDate) {
      // Kiểm tra sprint startDate có hợp lệ với project không
      const isValidWithProject =
        (!project.startDate || new Date(sprint.startDate) >= new Date(project.startDate)) &&
        (!project.endDate || new Date(sprint.startDate) <= new Date(project.endDate));

      // Chỉ set nếu hợp lệ, nếu không thì bỏ qua (không báo lỗi, chỉ set sprintId)
      if (isValidWithProject) {
        updateData.startDate = sprint.startDate;
      }
    }
  }

  // Xác định giá trị ngày cuối cùng sẽ được sử dụng (sau khi update)
  const finalStartDate = updateData.startDate !== undefined ? updateData.startDate : task.startDate;
  const finalDueDate = task.dueDate; // dueDate không thay đổi trong hàm này

  // Validate ngày: chỉ validate nếu task có ngày (sử dụng giá trị SAU khi update)
  if (finalStartDate) {
    if (project.startDate && new Date(finalStartDate) < new Date(project.startDate)) {
      const error = new Error("Task start date cannot be before project start date");
      error.statusCode = 400;
      throw error;
    }
    if (project.endDate && new Date(finalStartDate) > new Date(project.endDate)) {
      const error = new Error("Task start date cannot be after project end date");
      error.statusCode = 400;
      throw error;
    }
  }

  if (finalDueDate) {
    if (project.startDate && new Date(finalDueDate) < new Date(project.startDate)) {
      const error = new Error("Task due date cannot be before project start date");
      error.statusCode = 400;
      throw error;
    }
    if (project.endDate && new Date(finalDueDate) > new Date(project.endDate)) {
      const error = new Error("Task due date cannot be after project end date");
      error.statusCode = 400;
      throw error;
    }
  }

  // Nếu có sprint, tự động điều chỉnh ngày task phải nằm trong khoảng sprint (chỉ khi task có ngày)
  if (sprint) {
    let adjustedStartDate = finalStartDate;
    let adjustedDueDate = finalDueDate;

    if (adjustedStartDate) {
      if (sprint.startDate && new Date(adjustedStartDate) < new Date(sprint.startDate)) {
        adjustedStartDate = sprint.startDate;
        updateData.startDate = sprint.startDate;
      }
      if (sprint.endDate && new Date(adjustedStartDate) > new Date(sprint.endDate)) {
        adjustedStartDate = sprint.endDate;
        updateData.startDate = sprint.endDate;
      }
    }

    if (adjustedDueDate) {
      if (sprint.startDate && new Date(adjustedDueDate) < new Date(sprint.startDate)) {
        adjustedDueDate = sprint.startDate;
        updateData.dueDate = sprint.startDate;
      }
      if (sprint.endDate && new Date(adjustedDueDate) > new Date(sprint.endDate)) {
        adjustedDueDate = sprint.endDate;
        updateData.dueDate = sprint.endDate;
      }
    }

    // Đảm bảo startDate <= dueDate
    if (adjustedStartDate && adjustedDueDate && new Date(adjustedStartDate) > new Date(adjustedDueDate)) {
      updateData.startDate = adjustedDueDate;
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
    (t) => t.from.toString() === currentStatusId.toString() && t.to.toString() === statusId.toString(),
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

  // Update parent task progress if this was a sub-task
  if (deletedTask.parentTaskId) {
    await updateParentTaskProgress(deletedTask.parentTaskId);
  }

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
  const historyRecords = await TaskHistory.find({ taskId: taskId, userId: { $exists: true, $ne: null } })
    .populate("userId", "fullname avatar")
    .sort({ createdAt: -1 })
    .lean();

  if (!historyRecords.length) {
    return historyRecords;
  }

  const fieldConfig = {
    assigneeId: "user",
    reporterId: "user",
    createdById: "user",
    priorityId: "priority",
    taskTypeId: "taskType",
    platformId: "platform",
    sprintId: "sprint",
    statusId: "status",
  };

  const isObjectIdLike = (value) => {
    if (!value) return false;
    if (typeof value === "object" && value._id) {
      return /^[a-f\d]{24}$/i.test(String(value._id));
    }
    return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
  };

  const toObjectIdString = (value) => {
    if (!value) return null;
    if (typeof value === "object" && value._id) return String(value._id);
    return String(value);
  };

  const idsByType = {
    user: new Set(),
    priority: new Set(),
    taskType: new Set(),
    platform: new Set(),
    sprint: new Set(),
    status: new Set(),
  };

  historyRecords.forEach((item) => {
    const mappedType = fieldConfig[item.fieldName];
    if (!mappedType) return;

    [item.oldValue, item.newValue].forEach((value) => {
      if (!isObjectIdLike(value)) return;
      idsByType[mappedType].add(toObjectIdString(value));
    });
  });

  const [users, priorities, taskTypes, platforms, sprints, taskWithProject] = await Promise.all([
    idsByType.user.size
      ? User.find({ _id: { $in: Array.from(idsByType.user) } })
          .select("fullname")
          .lean()
      : [],
    idsByType.priority.size
      ? Priority.find({ _id: { $in: Array.from(idsByType.priority) } })
          .select("name")
          .lean()
      : [],
    idsByType.taskType.size
      ? TaskType.find({ _id: { $in: Array.from(idsByType.taskType) } })
          .select("name")
          .lean()
      : [],
    idsByType.platform.size
      ? Platform.find({ _id: { $in: Array.from(idsByType.platform) } })
          .select("name")
          .lean()
      : [],
    idsByType.sprint.size
      ? Sprint.find({ _id: { $in: Array.from(idsByType.sprint) } })
          .select("name")
          .lean()
      : [],
    Task.findById(taskId).select("projectId").lean(),
  ]);

  const userNameMap = new Map(users.map((item) => [item._id.toString(), item.fullname]));
  const priorityNameMap = new Map(priorities.map((item) => [item._id.toString(), item.name]));
  const taskTypeNameMap = new Map(taskTypes.map((item) => [item._id.toString(), item.name]));
  const platformNameMap = new Map(platforms.map((item) => [item._id.toString(), item.name]));
  const sprintNameMap = new Map(sprints.map((item) => [item._id.toString(), item.name]));

  const statusNameMap = new Map();
  if (taskWithProject?.projectId) {
    const workflow = await Workflow.findOne({ projectId: taskWithProject.projectId }).select("statuses").lean();
    if (workflow?.statuses?.length) {
      workflow.statuses.forEach((status) => {
        statusNameMap.set(status._id.toString(), status.name);
      });
    }
  }

  const mapValue = (fieldName, value) => {
    if (value === null || value === undefined || value === "") return null;

    if (typeof value === "object") {
      if (value.fullname) return value.fullname;
      if (value.name) return value.name;
      if (value._id) {
        const objectIdValue = String(value._id);
        if (fieldName === "assigneeId" || fieldName === "reporterId" || fieldName === "createdById")
          return userNameMap.get(objectIdValue) || objectIdValue;
        if (fieldName === "priorityId") return priorityNameMap.get(objectIdValue) || objectIdValue;
        if (fieldName === "taskTypeId") return taskTypeNameMap.get(objectIdValue) || objectIdValue;
        if (fieldName === "platformId") return platformNameMap.get(objectIdValue) || objectIdValue;
        if (fieldName === "sprintId") return sprintNameMap.get(objectIdValue) || objectIdValue;
        if (fieldName === "statusId") return statusNameMap.get(objectIdValue) || objectIdValue;
      }
      return String(value);
    }

    if (fieldName === "assigneeId" || fieldName === "reporterId" || fieldName === "createdById") {
      return userNameMap.get(String(value)) || String(value);
    }
    if (fieldName === "priorityId") {
      return priorityNameMap.get(String(value)) || String(value);
    }
    if (fieldName === "taskTypeId") {
      return taskTypeNameMap.get(String(value)) || String(value);
    }
    if (fieldName === "platformId") {
      return platformNameMap.get(String(value)) || String(value);
    }
    if (fieldName === "sprintId") {
      return sprintNameMap.get(String(value)) || String(value);
    }
    if (fieldName === "statusId") {
      return statusNameMap.get(String(value)) || String(value);
    }

    return String(value);
  };

  return historyRecords.map((item) => ({
    ...item,
    oldValue: mapValue(item.fieldName, item.oldValue),
    newValue: mapValue(item.fieldName, item.newValue),
  }));
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

  let originalFilename = file.originalname;
  try {
    originalFilename = Buffer.from(file.originalname, 'latin1').toString('utf8');
  } catch (e) {}

  // Logic mới: Sử dụng thông tin từ Cloudinary (req.file)
  const newAttachment = {
    filename: originalFilename, // Tên file gốc
    url: file.path, // URL từ Cloudinary
    public_id: file.filename, // public_id từ Cloudinary
  };

  task.attachments.push(newAttachment);

  const updatedTask = await task.save();

  // Create ProjectDocument entry for task attachment (share with PM + Leader)
  try {
    const project = await Project.findById(task.projectId).lean();
    if (project) {
      const sharedWith = project.members.filter((m) => m.role === "PROJECT_MANAGER" || m.role === "LEADER").map((m) => m.userId);

      await ProjectDocument.create({
        projectId: task.projectId,
        filename: newAttachment.filename,
        url: newAttachment.url,
        public_id: newAttachment.public_id,
        category: "other",
        version: "v1",
        tags: [],
        sourceType: "task",
        parent: {
          taskId: task._id,
          taskKey: task.key,
          taskName: task.name,
        },
        uploadedBy: userId,
        sharedWith,
        uploadedAt: new Date(),
      });
    }
  } catch (docError) {
    console.error("[TaskService] Failed to create ProjectDocument:", docError.message);
  }

  await logHistory(taskId, userId, "Attachment", null, `Đã thêm tệp đính kèm: ${file.originalname}`, "UPDATE");

  // Dùng lại hàm populate của bạn để trả về dữ liệu đầy đủ
  return populateFullTask(Task.findById(updatedTask._id));
};

const addAttachmentsFromDocuments = async (taskId, documentIds, userId) => {
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    const error = new Error("No document selected");
    error.statusCode = 400;
    throw error;
  }

  const task = await Task.findById(taskId);
  if (!task) {
    const error = new Error("Không tìm thấy công việc");
    error.statusCode = 404;
    throw error;
  }

  const docs = await ProjectDocument.find({
    _id: { $in: documentIds },
    projectId: task.projectId,
  }).lean();

  const userIdStr = userId.toString();
  const allowedDocs = docs.filter((doc) => {
    const uploadedBy = doc.uploadedBy?.toString?.() || doc.uploadedBy?.toString?.();
    const sharedIds = (doc.sharedWith || []).map((id) => id.toString());
    return uploadedBy === userIdStr || sharedIds.includes(userIdStr);
  });

  if (allowedDocs.length === 0) {
    const error = new Error("You do not have access to selected documents");
    error.statusCode = 403;
    throw error;
  }

  const existingKeys = new Set((task.attachments || []).map((att) => att.public_id || att.url));
  const newAttachments = allowedDocs
    .map((doc) => ({
      filename: doc.filename,
      url: doc.url,
      public_id: doc.public_id || doc._id.toString(),
      uploadedAt: doc.uploadedAt || new Date(),
    }))
    .filter((att) => !existingKeys.has(att.public_id || att.url));

  if (newAttachments.length === 0) {
    const error = new Error("Selected documents are already attached");
    error.statusCode = 400;
    throw error;
  }

  task.attachments.push(...newAttachments);
  const updatedTask = await task.save();

  // Create ProjectDocument entries for task attachments
  try {
    const project = await Project.findById(task.projectId).lean();
    if (project) {
      const sharedWith = project.members.filter((m) => m.role === "PROJECT_MANAGER" || m.role === "LEADER").map((m) => m.userId);
      await ProjectDocument.insertMany(
        newAttachments.map((att) => ({
          projectId: task.projectId,
          filename: att.filename,
          url: att.url,
          public_id: att.public_id,
          category: "other",
          version: "v1",
          tags: [],
          sourceType: "task",
          parent: {
            taskId: task._id,
            taskKey: task.key,
            taskName: task.name,
          },
          uploadedBy: userId,
          sharedWith,
          uploadedAt: new Date(),
        })),
      );
    }
  } catch (docError) {
    console.error("[TaskService] Failed to create ProjectDocument from doc attach:", docError.message);
  }

  await logHistory(taskId, userId, "Attachment", null, `Đã đính kèm tệp từ tài liệu dự án`, "UPDATE");

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
    {
      path: "projectId",
      select: "name key isDeleted status members",
      populate: { path: "members.userId", select: "_id fullname username email avatar status role" },
    },
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
const getTaskByKey = async (taskKey, user) => {
  const task = await Task.findOne({ key: taskKey.toUpperCase() }).populate([
    // Sao chép phần populate từ hàm updateTask để đảm bảo nhất quán
    {
      path: "projectId",
      select: "name key status isDeleted members",
      populate: { path: "members.userId", select: "_id fullname username email avatar status role" },
    }, // Thêm status và isDeleted và members
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

  if (user && user.role !== "admin") {
    const hasAccess = await assertTaskAccessByKey(user, task);
    if (!hasAccess) {
      const error = new Error("You do not have permission to access this task");
      error.statusCode = 403;
      throw error;
    }
  }

  return task;
};

const removeAssigneeFromIncompleteTasks = async (userId) => {
  try {
    const workflows = await Workflow.find({}, "statuses");

    let doneStatusIds = [];

    workflows.forEach((wf) => {
      if (wf.statuses && Array.isArray(wf.statuses)) {
        wf.statuses.forEach((status) => {
          if (status.category && status.category.toLowerCase() === "done") {
            doneStatusIds.push(status._id);
          }
        });
      }
    });

    const result = await Task.updateMany(
      {
        assigneeId: userId,
        statusId: { $nin: doneStatusIds },
      },
      {
        $set: { assigneeId: null }, // Đưa về Unassigned
      },
    );

    console.log(`Đã gỡ User ${userId} khỏi ${result.modifiedCount} task chưa hoàn thành.`);
    return result;
  } catch (error) {
    console.error("Lỗi khi gỡ user khỏi task:", error);
  }
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
  addAttachmentsFromDocuments,
  deleteAttachment,
  linkTask,
  unlinkTask,
  getTaskByKey,
  removeAssigneeFromIncompleteTasks,
};
