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
const cloudinary = require("../config/cloudinary");
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
    managedOnly, // when true restrict results to projects the user manages
  } = queryParams;

  const query = {};

  if (projectId) query.projectId = projectId;
  if (assigneeId) query.assigneeId = assigneeId;
  if (reporterId) query.reporterId = reporterId;
  if (createdById) query.createdById = createdById;
  if (statusId) query.statusId = statusId;
  if (priorityId) query.priorityId = priorityId;
  if (taskTypeId) query.taskTypeId = taskTypeId;

  // Phân quyền theo từng project
  if (user && user.role !== "admin") {
    const userId = user._id || user.id;
    // Lấy tất cả project liên quan đến user
    const projects = await Project.find({
      $or: [{ "members.userId": userId }, { "teams.leaderId": userId }, { "teams.members.userId": userId }],
    });

    // Tạo map projectId -> role của user trong project đó
    const projectRoleMap = {};
    for (const project of projects) {
      // Check PM
      const member = (project.members || []).find((m) => m.userId.toString() === userId.toString());
      if (member && member.role === "PROJECT_MANAGER") {
        projectRoleMap[project._id] = "PROJECT_MANAGER";
        continue;
      }
      // Check leader
      const isLeader = (project.teams || []).some((team) => team.leaderId?.toString() === userId.toString());
      if (isLeader) {
        projectRoleMap[project._id] = "TEAM_LEADER";
        continue;
      }
      // Member thường
      if (member) {
        projectRoleMap[project._id] = "MEMBER";
      }
    }

    // Lấy tất cả team mà user là leader, và memberId của các team đó
    let leadMemberIds = new Set();
    for (const project of projects) {
      if (projectRoleMap[project._id] === "TEAM_LEADER") {
        for (const team of project.teams || []) {
          if (team.leaderId?.toString() === userId.toString()) {
            (team.members || []).forEach((m) => leadMemberIds.add(m.toString()));
          }
        }
      }
    }

    // Xây dựng query
    const orConditions = [];
    // PM: thấy mọi task trong project mình là PM
    const pmProjectIds = Object.keys(projectRoleMap).filter((pid) => projectRoleMap[pid] === "PROJECT_MANAGER");
    if (pmProjectIds.length > 0) {
      orConditions.push({ projectId: { $in: pmProjectIds } });
    }
    // Leader: thấy task của thành viên nhóm mình lead (ở project mình lead)
    const leaderProjectIds = Object.keys(projectRoleMap).filter((pid) => projectRoleMap[pid] === "TEAM_LEADER");
    if (leaderProjectIds.length > 0 && leadMemberIds.size > 0) {
      orConditions.push({
        $and: [
          { projectId: { $in: leaderProjectIds } },
          {
            $or: [{ assigneeId: { $in: Array.from(leadMemberIds) } }, { reporterId: { $in: Array.from(leadMemberIds) } }],
          },
        ],
      });
    }
    // Determine if managedOnly flag was requested
    const isManagedOnly = managedOnly === true || managedOnly === "true";

    // If managedOnly requested, restrict to projects user manages (PM or Team Leader).
    if (isManagedOnly) {
      const managedIds = [...new Set([...pmProjectIds, ...leaderProjectIds])];

      // If there are no managed projects -> immediately return empty
      if (managedIds.length === 0) return [];

      // If frontend requested a specific projectId, ensure it's within managedIds
      if (projectId) {
        const requestedId = projectId.toString();
        if (!managedIds.includes(requestedId)) {
          // requested project is not managed by user -> no results
          return [];
        }
        // allowed: keep specific projectId (do not overwrite)
        query.projectId = projectId;

        // Nếu user là leader trong project này, chỉ hiển thị tasks của team members
        if (projectRoleMap[requestedId] === "TEAM_LEADER") {
          const project = projects.find((p) => p._id.toString() === requestedId);
          if (project) {
            let teamMemberIds = new Set();
            teamMemberIds.add(userId.toString()); // Leader cũng có thể được assign task
            for (const team of project.teams || []) {
              if (team.leaderId?.toString() === userId.toString()) {
                (team.members || []).forEach((m) => teamMemberIds.add(m.toString()));
              }
            }
            // Chỉ hiển thị tasks được assign hoặc report bởi team members
            query.$and = query.$and || [];
            query.$and.push({
              $or: [{ assigneeId: { $in: Array.from(teamMemberIds) } }, { reporterId: { $in: Array.from(teamMemberIds) } }],
            });
          }
        }
      } else {
        // otherwise restrict to managed projects
        query.projectId = { $in: managedIds };
      }
    }
    // By default, always see tasks assigned to or reported by the user
    // If managedOnly is requested, skip these to restrict results to managed projects
    if (!isManagedOnly) {
      orConditions.push({ assigneeId: userId });
      orConditions.push({ reporterId: userId });
    }

    if (orConditions.length > 0) {
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: orConditions }];
        delete query.$or;
      } else {
        query.$or = orConditions;
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

    // Validate startDate <= dueDate if both exist
    if (newStartDate && newDueDate) {
      const start = new Date(newStartDate).setHours(0, 0, 0, 0);
      const due = new Date(newDueDate).setHours(0, 0, 0, 0);
      if (start > due) {
        const error = new Error("Start date must be before or equal to due date");
        error.statusCode = 400;
        throw error;
      }
    }

    // Validate startDate with project dates (only if task has startDate)
    if (newStartDate) {
      if (project.startDate && new Date(newStartDate) < new Date(project.startDate)) {
        const error = new Error("Task start date cannot be before project start date");
        error.statusCode = 400;
        throw error;
      }
      if (project.endDate && new Date(newStartDate) > new Date(project.endDate)) {
        const error = new Error("Task start date cannot be after project end date");
        error.statusCode = 400;
        throw error;
      }
    }

    // Validate dueDate with project dates (only if task has dueDate)
    if (newDueDate) {
      if (project.startDate && new Date(newDueDate) < new Date(project.startDate)) {
        const error = new Error("Task due date cannot be before project start date");
        error.statusCode = 400;
        throw error;
      }
      if (project.endDate && new Date(newDueDate) > new Date(project.endDate)) {
        const error = new Error("Task due date cannot be after project end date");
        error.statusCode = 400;
        throw error;
      }
    }

    // If task has a sprint, validate dates with sprint dates (only if task has dates)
    if (originalTask.sprintId) {
      const Sprint = require("../models/Sprint");
      const sprint = await Sprint.findById(originalTask.sprintId);
      if (sprint) {
        if (newStartDate) {
          if (sprint.startDate && new Date(newStartDate) < new Date(sprint.startDate)) {
            const error = new Error("Task start date cannot be before sprint start date");
            error.statusCode = 400;
            throw error;
          }
          if (sprint.endDate && new Date(newStartDate) > new Date(sprint.endDate)) {
            const error = new Error("Task start date cannot be after sprint end date");
            error.statusCode = 400;
            throw error;
          }
        }

        if (newDueDate) {
          if (sprint.startDate && new Date(newDueDate) < new Date(sprint.startDate)) {
            const error = new Error("Task due date cannot be before sprint start date");
            error.statusCode = 400;
            throw error;
          }
          if (sprint.endDate && new Date(newDueDate) > new Date(sprint.endDate)) {
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
        (s) => s._id.toString() === populatedTask.statusId._id?.toString() || s._id.toString() === populatedTask.statusId.toString()
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

  // Nếu có sprint, validate ngày task phải nằm trong khoảng sprint (chỉ khi task có ngày)
  if (sprint) {
    if (finalStartDate) {
      if (sprint.startDate && new Date(finalStartDate) < new Date(sprint.startDate)) {
        const error = new Error("Task start date cannot be before sprint start date");
        error.statusCode = 400;
        throw error;
      }
      if (sprint.endDate && new Date(finalStartDate) > new Date(sprint.endDate)) {
        const error = new Error("Task start date cannot be after sprint end date");
        error.statusCode = 400;
        throw error;
      }
    }

    if (finalDueDate) {
      if (sprint.startDate && new Date(finalDueDate) < new Date(sprint.startDate)) {
        const error = new Error("Task due date cannot be before sprint start date");
        error.statusCode = 400;
        throw error;
      }
      if (sprint.endDate && new Date(finalDueDate) > new Date(sprint.endDate)) {
        const error = new Error("Task due date cannot be after sprint end date");
        error.statusCode = 400;
        throw error;
      }
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
const getTaskByKey = async (taskKey) => {
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
      }
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
  deleteAttachment,
  linkTask,
  unlinkTask,
  getTaskByKey,
  removeAssigneeFromIncompleteTasks,
};
