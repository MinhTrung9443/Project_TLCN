const mongoose = require("mongoose");
const Project = require("../models/Project");
const User = require("../models/User");
const Sprint = require("../models/Sprint");
const Platform = require("../models/Platform");
const Priority = require("../models/Priority");
const TaskType = require("../models/TaskType");
const Workflow = require("../models/Workflow");
const taskService = require("./TaskService");
const { getUserTaskAccessContext } = require("../utils/taskPermission");

const DEFAULT_PRIORITY_LEVEL = "2";

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanString = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value && value !== 0) return [];
  return [value];
};

const parseDateValue = (value) => {
  const raw = cleanString(value);
  if (!raw) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { error: `Ngày không hợp lệ: ${raw}` };
  }

  return parsed;
};

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeTaskInput = (input, index, sourceLabel = "") => {
  const row = input || {};
  const rowLabel = cleanString(row.sourceLabel);
  return {
    rowNumber: row.rowNumber || row.row || index + 1,
    sourceLabel: rowLabel || (sourceLabel ? `${sourceLabel} - dòng ${index + 1}` : `Dòng ${index + 1}`),
    taskName: cleanString(row.taskName || row.taskTitle || row.name || row.title),
    projectName: cleanString(row.projectName || row.project || row.projectKey || row.projectId),
    assigneeName: cleanString(row.assigneeName || row.assignee || row.assigneeEmail),
    sprintName: cleanString(row.sprintName || row.sprint),
    platformName: cleanString(row.platformName || row.platform),
    priorityLevel: cleanString(row.priorityLevel || row.priorityName || row.priority),
    taskTypeName: cleanString(row.taskTypeName || row.taskType || row.type),
    statusName: cleanString(row.statusName || row.status),
    description: cleanString(row.description || row.taskDescription),
    startDate: cleanString(row.startDate),
    dueDate: cleanString(row.dueDate),
    estimatedTime: normalizeNumber(row.estimatedTime),
    actualTime: normalizeNumber(row.actualTime),
    raw: row,
  };
};

const findProject = async (taskInput) => {
  const projectRef = cleanString(taskInput.projectName);
  if (!projectRef) return null;

  if (mongoose.Types.ObjectId.isValid(projectRef)) {
    const byId = await Project.findById(projectRef);
    if (byId) return byId;
  }

  const exactKey = await Project.findOne({ key: new RegExp(`^${escapeRegex(projectRef)}$`, "i") });
  if (exactKey) return exactKey;

  const exactName = await Project.findOne({ name: new RegExp(`^${escapeRegex(projectRef)}$`, "i") });
  if (exactName) return exactName;

  return Project.findOne({ name: new RegExp(escapeRegex(projectRef), "i") });
};

const findUserByReference = async (reference) => {
  const cleanReference = cleanString(reference).replace(/^@/, "");
  if (!cleanReference) return null;

  const user = await User.findOne({
    $or: [
      { email: new RegExp(`^${escapeRegex(cleanReference)}$`, "i") },
      { fullname: new RegExp(escapeRegex(cleanReference), "i") },
    ],
  });

  return user;
};

const isUserInProject = (project, userId) => {
  if (!project || !userId) return false;

  const userIdStr = userId.toString();
  return (
    project.members?.some((member) => member.userId?.toString() === userIdStr) ||
    project.teams?.some(
      (team) => team.leaderId?.toString() === userIdStr || team.members?.some((memberId) => memberId?.toString() === userIdStr),
    )
  );
};

const findScopedEntityByName = async (Model, name, projectId, allowGlobal = true) => {
  const cleanName = cleanString(name);
  if (!cleanName) return null;

  const exactProjectMatch = await Model.findOne({
    name: new RegExp(`^${escapeRegex(cleanName)}$`, "i"),
    projectId,
  });
  if (exactProjectMatch) return exactProjectMatch;

  if (allowGlobal) {
    const exactGlobalMatch = await Model.findOne({
      name: new RegExp(`^${escapeRegex(cleanName)}$`, "i"),
      $or: [{ projectId: null }, { projectId: { $exists: false } }],
    });
    if (exactGlobalMatch) return exactGlobalMatch;
  }

  return null;
};

const getDefaultWorkflowStatus = async (projectId) => {
  const workflow = await Workflow.findOne({ projectId });
  const defaultStatus = workflow?.statuses?.find((status) => status.category === "To Do");
  return defaultStatus || null;
};

const resolveTaskType = async (taskTypeName, projectId) => {
  if (!taskTypeName) {
    const defaultTaskType = await TaskType.findOne({ name: "Task", projectId });
    if (defaultTaskType) return defaultTaskType;
    return TaskType.findOne({ name: "Task", projectId: null });
  }

  return findScopedEntityByName(TaskType, taskTypeName, projectId, true);
};

const resolvePriority = async (priorityLevel, projectId) => {
  if (!priorityLevel) {
    let defaultPriority = await Priority.findOne({ level: DEFAULT_PRIORITY_LEVEL, projectId });
    if (!defaultPriority) {
      defaultPriority = await Priority.findOne({ level: DEFAULT_PRIORITY_LEVEL, projectId: null });
    }
    return defaultPriority;
  }

  const byName = await findScopedEntityByName(Priority, priorityLevel, projectId, true);
  if (byName) return byName;

  const numericLevel = normalizeNumber(priorityLevel);
  if (numericLevel !== null) {
    const projectPriority = await Priority.findOne({ level: numericLevel, projectId });
    if (projectPriority) return projectPriority;

    return Priority.findOne({ level: numericLevel, projectId: null });
  }

  return null;
};

const resolvePlatform = async (platformName, projectId) => {
  if (!platformName) return null;
  return findScopedEntityByName(Platform, platformName, projectId, true);
};

const resolveSprint = async (sprintName, projectId) => {
  if (!sprintName) {
    let backlogSprint = await Sprint.findOne({ name: new RegExp("^Backlog$", "i"), projectId });
    if (!backlogSprint) {
      backlogSprint = await Sprint.findOne({ name: new RegExp("^Backlog$", "i"), projectId: null });
    }
    return backlogSprint;
  }

  return Sprint.findOne({ name: new RegExp(`^${escapeRegex(sprintName)}$`, "i"), projectId });
};

const resolveTaskStatus = async (statusName, projectId) => {
  if (statusName) {
    const workflow = await Workflow.findOne({ projectId });
    const status = workflow?.statuses?.find((item) => {
      const nameMatch = new RegExp(`^${escapeRegex(statusName)}$`, "i").test(item.name || "");
      const categoryMatch = new RegExp(`^${escapeRegex(statusName)}$`, "i").test(item.category || "");
      return nameMatch || categoryMatch;
    });
    if (status) return status;
  }

  return getDefaultWorkflowStatus(projectId);
};

const validateTaskInput = async (taskInput, context) => {
  const { user, accessContext, isSystemAdmin } = context;
  const errors = [];
  const warnings = [];

  const project = await findProject(taskInput);
  const taskName = cleanString(taskInput.taskName);

  if (!taskName) {
    errors.push("Thiếu required field: taskName");
  }

  if (!taskInput.projectName) {
    errors.push("Thiếu required field: projectName");
  }

  if (!project) {
    errors.push(`Không tìm thấy dự án "${taskInput.projectName || "không xác định"}"`);
    return { ok: false, errors, warnings, project: null };
  }

  if (project.status === "completed") {
    errors.push(`Dự án "${project.name}" đang ở trạng thái completed nên không thể tạo task`);
  }

  const projectId = project._id.toString();
  if (!isSystemAdmin && !accessContext.allowedProjectIds.includes(projectId)) {
    errors.push(`Bạn không có quyền tạo task trong dự án "${project.name}"`);
  }

  const startDate = parseDateValue(taskInput.startDate);
  if (startDate && startDate.error) errors.push(startDate.error);

  const dueDate = parseDateValue(taskInput.dueDate);
  if (dueDate && dueDate.error) errors.push(dueDate.error);

  if (startDate instanceof Date && dueDate instanceof Date && dueDate.getTime() < startDate.getTime()) {
    errors.push(`Due date phải lớn hơn hoặc bằng start date cho task "${taskName || taskInput.sourceLabel}"`);
  }

  let assigneeId = null;
  if (taskInput.assigneeName) {
    const assignee = await findUserByReference(taskInput.assigneeName);
    if (!assignee) {
      errors.push(`Không tìm thấy người được giao "${taskInput.assigneeName}" trong task "${taskName || taskInput.sourceLabel}"`);
    } else if (!isSystemAdmin && !isUserInProject(project, assignee._id) && assignee.role !== "admin") {
      errors.push(`Người được giao "${assignee.fullname}" không thuộc dự án "${project.name}"`);
    } else {
      assigneeId = assignee._id;
    }
  }

  const sprint = await resolveSprint(taskInput.sprintName, project._id);
  if (taskInput.sprintName && !sprint) {
    errors.push(`Không tìm thấy sprint "${taskInput.sprintName}" trong dự án "${project.name}"`);
  }

  const platform = await resolvePlatform(taskInput.platformName, project._id);
  if (taskInput.platformName && !platform) {
    errors.push(`Không tìm thấy platform "${taskInput.platformName}" trong dự án "${project.name}"`);
  }

  const priority = await resolvePriority(taskInput.priorityLevel, project._id);
  if (taskInput.priorityLevel && !priority) {
    errors.push(`Không tìm thấy priority "${taskInput.priorityLevel}" trong dự án "${project.name}"`);
  }

  const taskType = await resolveTaskType(taskInput.taskTypeName, project._id);
  if (taskInput.taskTypeName && !taskType) {
    errors.push(`Không tìm thấy task type "${taskInput.taskTypeName}" trong dự án "${project.name}"`);
  }

  const status = await resolveTaskStatus(taskInput.statusName, project._id);
  if (taskInput.statusName && !status) {
    errors.push(`Không tìm thấy status "${taskInput.statusName}" trong workflow của dự án "${project.name}"`);
  }

  if (!status) {
    errors.push(`Không tìm thấy trạng thái mặc định (To Do) cho dự án "${project.name}"`);
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings,
      project,
    };
  }

  const taskData = {
    name: taskName,
    projectId: project._id,
    reporterId: user._id,
    createdById: user._id,
    statusId: status._id,
  };

  if (taskInput.description) taskData.description = taskInput.description;
  if (startDate instanceof Date) taskData.startDate = startDate;
  if (dueDate instanceof Date) taskData.dueDate = dueDate;
  if (taskInput.estimatedTime !== null) taskData.estimatedTime = taskInput.estimatedTime;
  if (taskInput.actualTime !== null) taskData.actualTime = taskInput.actualTime;
  if (assigneeId) taskData.assigneeId = assigneeId;
  if (sprint) taskData.sprintId = sprint._id;
  if (platform) taskData.platformId = platform._id;
  if (priority) taskData.priorityId = priority._id;
  if (taskType) taskData.taskTypeId = taskType._id;

  return {
    ok: true,
    warnings,
    project,
    taskData,
    normalizedInput: taskInput,
  };
};

const formatRowError = (row) => {
  const label = row.normalizedInput?.sourceLabel || `Dòng ${row.rowNumber}`;
  const taskName = row.normalizedInput?.taskName || "không xác định";
  const projectName = row.normalizedInput?.projectName || row.project?.name || "không xác định";
  const reasons = row.errors.length ? row.errors.map((item) => `  - ${item}`).join("\n") : "  - Không xác định được lỗi";

  return `- ${label}: task "${taskName}" trong project "${projectName}" không được tạo\n${reasons}`;
};

const formatCreatedRow = (row, index) => {
  const task = row.task;
  const taskUrl = `/app/task/${task.key}`;
  const assigneeText = row.task.assigneeId ? row.assigneeName || row.task.assigneeId?.fullname || "Đã gán" : "Chưa gán";
  const warningText = row.warnings?.length ? ` ${row.warnings.map((warning) => `(${warning})`).join(" ")}` : "";

  return `${index + 1}. [${task.key}](${taskUrl}) - ${task.name}\n   Dự án: ${row.projectName}\n   Giao cho: ${assigneeText}${warningText}`;
};

const processTaskInputs = async (rawInputs, user, options = {}) => {
  const inputs = asArray(rawInputs).map((input, index) => normalizeTaskInput(input, index, options.sourceLabel));
  const accessContext = await getUserTaskAccessContext(user, { projectStatus: "any" });
  const isSystemAdmin = user?.role === "admin";

  const createdRows = [];
  const failedRows = [];

  for (const input of inputs) {
    const validation = await validateTaskInput(input, { user, accessContext, isSystemAdmin });
    if (!validation.ok) {
      failedRows.push({
        rowNumber: input.rowNumber,
        normalizedInput: input,
        project: validation.project,
        errors: validation.errors,
      });
      continue;
    }

    try {
      const createdTask = await taskService.createTask(validation.taskData, user._id);
      createdRows.push({
        rowNumber: input.rowNumber,
        normalizedInput: input,
        projectName: validation.project.name,
        task: createdTask,
        assigneeName: input.assigneeName,
        warnings: validation.warnings,
      });
    } catch (error) {
      failedRows.push({
        rowNumber: input.rowNumber,
        normalizedInput: input,
        project: validation.project,
        errors: [error.message || "Không thể tạo task"],
      });
    }
  }

  const createdText = createdRows.length
    ? `🎉 Thành công: đã tạo ${createdRows.length} task\n\n${createdRows.map((row, index) => formatCreatedRow(row, index)).join("\n\n")}`
    : "";

  const failedText = failedRows.length
    ? `⚠️ Không tạo được ${failedRows.length} task\n${failedRows.map((row) => formatRowError(row)).join("\n")}`
    : "";

  const summaryText = [`Tổng số task đầu vào: ${inputs.length}`, `Tạo thành công: ${createdRows.length}`, `Không tạo được: ${failedRows.length}`].join("\n");

  return {
    inputs,
    createdRows,
    failedRows,
    summaryText,
    responseText: [summaryText, createdText, failedText].filter(Boolean).join("\n\n"),
  };
};

module.exports = {
  processTaskInputs,
  normalizeTaskInput,
};