const mongoose = require("mongoose");
const crypto = require("crypto");
const OpenAI = require("openai");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Sprint = require("../models/Sprint");
const User = require("../models/User");
const TaskType = require("../models/TaskType");
const Priority = require("../models/Priority");
const Workflow = require("../models/Workflow");
const TimeLog = require("../models/TimeLog");
const ProjectReportSnapshot = require("../models/ProjectReportSnapshot");

const reportAiApiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
const reportAiBaseUrl = process.env.OPENAI_BASE_URL || undefined;
const reportAiHeaders = {
  ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
  ...(process.env.OPENROUTER_APP_NAME ? { "X-Title": process.env.OPENROUTER_APP_NAME } : {}),
};

const reportAiClient = reportAiApiKey
  ? new OpenAI({
      apiKey: reportAiApiKey,
      baseURL: reportAiBaseUrl,
      ...(Object.keys(reportAiHeaders).length ? { defaultHeaders: reportAiHeaders } : {}),
    })
  : null;

const DEFAULT_SCORE_WEIGHTS = {
  completion: 0.3,
  overdue: 0.2,
  estimation: 0.2,
  bugs: 0.15,
  workload: 0.15,
};

const REPORT_LEVELS = {
  SUCCESS: { minScore: 80, minCompletion: 80 },
  PARTIAL: { minScore: 50, minCompletion: 50 },
};

const BUG_ROOT_CAUSE_LIBRARY = [
  {
    category: "Communication Issues",
    explanation: "Lack of organized communication between stakeholders, development, and QA creates ambiguity and introduces defects.",
    example: "Testing team is unaware of recent developer changes and validates against outdated behavior.",
  },
  {
    category: "Complexity",
    explanation: "High cyclomatic complexity and nested logic increase the chance of missed paths and hidden defects.",
    example: "Conditional branches in workflow transitions are not fully covered, leading to incorrect status behavior.",
  },
  {
    category: "Design Issues",
    explanation: "Faulty or rushed design decisions propagate defects into implementation and testing.",
    example: "An interaction flow is designed without edge-case handling, causing repeated UX and logic bugs.",
  },
  {
    category: "Coding Errors",
    explanation: "Implementation mistakes, weak code review, and insufficient unit tests lead to functional regressions.",
    example: "A cancel action updates UI state but fails to close the modal in specific scenarios.",
  },
  {
    category: "Requirement Changes",
    explanation: "Frequent scope and requirement updates reduce stability and increase defect probability.",
    example: "Search behavior changes late from name-based to code-based matching and breaks existing filters.",
  },
  {
    category: "Time Management",
    explanation: "Compressed timelines reduce review and test depth, causing preventable defects to escape.",
    example: "Deadline pressure leads to skipping boundary test cases before release.",
  },
  {
    category: "Documentation Issues",
    explanation: "Poor documentation weakens maintainability and causes misunderstandings during fixes or enhancements.",
    example: "Legacy module logic is undocumented, so migration introduces avoidable bugs.",
  },
  {
    category: "Tooling Issues",
    explanation: "Incompatible, unstable, or poorly documented tools create integration and execution defects.",
    example: "A dependency update changes behavior and breaks existing build/runtime assumptions.",
  },
  {
    category: "Automation Issues",
    explanation: "Outdated automation scripts or over-reliance on automation misses important manual scenarios.",
    example: "Regression script does not include new flows, so bugs are found only in production-like usage.",
  },
  {
    category: "Testing Team Capability",
    explanation: "Insufficient domain context or testing skill reduces defect detection effectiveness.",
    example: "Domain-specific edge cases (e.g., date-time handling) are not covered in test execution.",
  },
  {
    category: "Version Control",
    explanation: "Weak branch strategy and commit hygiene make rollback and defect isolation difficult.",
    example: "Multiple unrelated changes are bundled, making root-cause isolation slow and error-prone.",
  },
  {
    category: "Release Management",
    explanation: "Frequent releases without adequate regression windows increase post-release defect leakage.",
    example: "A rushed deployment skips full regression and breaks a previously stable feature.",
  },
  {
    category: "Poor Test Coverage",
    explanation: "Missing unit/integration coverage leaves edge cases and negative paths unverified.",
    example: "Null/empty input cases are not tested, causing runtime failures.",
  },
  {
    category: "Third-Party Dependencies",
    explanation: "External API/library changes can break internal behavior without direct code changes.",
    example: "A third-party endpoint contract changes and fails integration workflows.",
  },
  {
    category: "Last-Minute Changes",
    explanation: "Late changes before release often bypass full verification and introduce critical bugs.",
    example: "A last-minute library version change causes production defects that were not re-tested.",
  },
];

const toArray = (value) => (Array.isArray(value) ? value : []);

const toId = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    return value._id?.toString?.() || value.id?.toString?.() || value.value?.toString?.() || null;
  }
  return value.toString();
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatPercent = (value, digits = 1) => {
  if (!Number.isFinite(value)) return "N/A";
  return `${value.toFixed(digits)}%`;
};

const formatHours = (value) => {
  if (!Number.isFinite(value)) return "N/A";
  return `${value.toFixed(2)}h`;
};

const formatDays = (value) => {
  if (!Number.isFinite(value)) return "N/A";
  return `${value.toFixed(0)} days`;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeText = (value) =>
  (value || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeMarkdownCell = (value) =>
  String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");

const buildTable = (headers, rows) => {
  if (!rows.length) {
    return "_No data available._";
  }

  const headerRow = `| ${headers.map(escapeMarkdownCell).join(" | ")} |`;
  const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
  const bodyRows = rows.map((row) => `| ${row.map(escapeMarkdownCell).join(" | ")} |`);

  return [headerRow, separatorRow, ...bodyRows].join("\n");
};

const buildBulletList = (items, emptyText = "No data available.") => {
  if (!items || items.length === 0) return `- ${emptyText}`;
  return items.map((item) => `- ${item}`).join("\n");
};

const getDisplayName = (entity, fallback = "Unknown") => {
  if (!entity) return fallback;
  return entity.fullname || entity.fullName || entity.name || entity.username || entity.email || entity.title || fallback;
};

const getTaskStatusCategory = (task, statusMap) => {
  const statusId = toId(task.statusId);
  const workflowStatus = statusMap.get(statusId);
  if (workflowStatus?.category) {
    return workflowStatus.category;
  }

  const fallbackStatus = task.status || task.statusInfo || task.workflowStatus;
  if (fallbackStatus?.category) return fallbackStatus.category;
  if (typeof fallbackStatus === "string") return fallbackStatus;

  const progress = toNumber(task.progress);
  if (progress === 100) return "Done";
  if (progress > 0) return "In Progress";
  return "To Do";
};

const isBugTask = (task, taskTypeMap) => {
  const taskTypeId = toId(task.taskTypeId);
  const taskType = taskTypeMap.get(taskTypeId) || task.taskType || task.taskTypeInfo;
  const taskTypeName = getDisplayName(taskType, "");
  return normalizeText(taskTypeName) === "bug";
};

const getTaskPriority = (task, priorityMap) => {
  const priority = priorityMap.get(toId(task.priorityId)) || task.priority || task.priorityInfo;
  if (!priority) return { name: "N/A", level: null };
  return {
    name: getDisplayName(priority, "N/A"),
    level: toNumber(priority.level),
  };
};

const getSprintDurationDays = (sprint) => {
  const startDate = toDate(sprint.startDate);
  const endDate = toDate(sprint.endDate);
  if (!startDate || !endDate) return null;
  const durationMs = Math.max(0, endDate.getTime() - startDate.getTime());
  return durationMs / (1000 * 60 * 60 * 24);
};

const calculateScore = (metrics) => {
  const completionScore = clamp(metrics.completionRate ?? 0, 0, 100);
  const overdueScore = clamp(100 - (metrics.overdueRate ?? 0), 0, 100);
  const estimationScore = clamp(100 - (metrics.estimationVariance ?? 0), 0, 100);
  const bugScore = clamp(100 - (metrics.bugDensity ?? 0), 0, 100);
  const workloadScore = clamp(metrics.workloadBalanceScore ?? 0, 0, 100);

  const weighted =
    completionScore * DEFAULT_SCORE_WEIGHTS.completion +
    overdueScore * DEFAULT_SCORE_WEIGHTS.overdue +
    estimationScore * DEFAULT_SCORE_WEIGHTS.estimation +
    bugScore * DEFAULT_SCORE_WEIGHTS.bugs +
    workloadScore * DEFAULT_SCORE_WEIGHTS.workload;

  return {
    overallScore: Math.round(clamp(weighted, 0, 100)),
    breakdown: {
      completionScore: Math.round(completionScore),
      overdueScore: Math.round(overdueScore),
      estimationScore: Math.round(estimationScore),
      bugScore: Math.round(bugScore),
      workloadScore: Math.round(workloadScore),
    },
  };
};

const determineEvaluation = (overallScore, completionRate) => {
  if (overallScore >= REPORT_LEVELS.SUCCESS.minScore && completionRate >= REPORT_LEVELS.SUCCESS.minCompletion) {
    return "SUCCESS";
  }

  if (overallScore >= REPORT_LEVELS.PARTIAL.minScore || completionRate >= REPORT_LEVELS.PARTIAL.minCompletion) {
    return "PARTIAL";
  }

  return "FAILED";
};

const buildCoverageConfidence = (metrics) => {
  const coverageFactors = [
    metrics.hasTasks,
    metrics.hasSprints,
    metrics.hasUsers,
    metrics.hasWorkflows,
    metrics.hasTimeLogs,
    metrics.hasEstimates,
    metrics.hasAssignees,
  ];

  const positiveCount = coverageFactors.filter(Boolean).length;
  return Math.round((positiveCount / coverageFactors.length) * 100);
};

const createMemberRecord = (name) => ({
  name,
  tasks: 0,
  completedTasks: 0,
  assignedEstimatedTime: 0,
  assignedActualTime: 0,
  timeSpent: 0,
  overdueTasks: 0,
  bugTasks: 0,
  estimateVarianceSum: 0,
  estimatedTaskCount: 0,
});

const pickRootCauseCategories = ({ bugDensity, overdueRate, estimationVariance, recurringIssueCount, tasksExceedingEstimateCount }) => {
  const picks = [];

  if (bugDensity >= 25) {
    picks.push("Complexity", "Coding Errors", "Poor Test Coverage");
  }
  if (overdueRate >= 20) {
    picks.push("Time Management", "Release Management", "Last-Minute Changes");
  }
  if (estimationVariance >= 25 || tasksExceedingEstimateCount >= 3) {
    picks.push("Requirement Changes", "Design Issues");
  }
  if (recurringIssueCount > 0) {
    picks.push("Documentation Issues", "Communication Issues", "Automation Issues");
  }

  picks.push("Tooling Issues", "Third-Party Dependencies", "Testing Team Capability", "Version Control");

  const unique = Array.from(new Set(picks));
  return unique
    .map((name) => BUG_ROOT_CAUSE_LIBRARY.find((item) => item.category === name))
    .filter(Boolean)
    .slice(0, 12);
};

const asNonEmptyText = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asTextArray = (value, limit = 8) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asNonEmptyText(item))
    .filter(Boolean)
    .slice(0, limit);
};

const ensureReportAiConfigured = () => {
  if (reportAiClient) return;
  const error = new Error("Project report AI is not configured. Please set OPENROUTER_API_KEY or OPENAI_API_KEY.");
  error.statusCode = 503;
  throw error;
};

const buildNarrativeWithAi = async (facts) => {
  ensureReportAiConfigured();

  const systemPrompt = `You are a senior project analyst. Generate ONLY valid JSON and do not include markdown.
Rules:
- Use only the facts provided by user payload.
- Do not invent projects, users, sprints, causes, or numbers.
- Keep language concise, professional, and evidence-based.
- If data is insufficient, explicitly say data is insufficient for that point.`;

  const userPrompt = `Create JSON with EXACT keys:
{
  "timelineBeginning": "string",
  "timelineDevelopment": "string",
  "timelineChallenges": "string",
  "timelineCompletion": "string",
  "productivityReason": "string",
  "rootCauseAnalysis": ["string"],
  "recommendations": ["string"],
  "finalConclusion": "string",
  "keyLessons": "string",
  "futureRecommendations": "string"
}

Facts:
${JSON.stringify(facts, null, 2)}`;

  try {
    const response = await reportAiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = response?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    const normalized = {
      timelineBeginning: asNonEmptyText(parsed.timelineBeginning),
      timelineDevelopment: asNonEmptyText(parsed.timelineDevelopment),
      timelineChallenges: asNonEmptyText(parsed.timelineChallenges),
      timelineCompletion: asNonEmptyText(parsed.timelineCompletion),
      productivityReason: asNonEmptyText(parsed.productivityReason),
      rootCauseAnalysis: asTextArray(parsed.rootCauseAnalysis, 8),
      recommendations: asTextArray(parsed.recommendations, 6),
      finalConclusion: asNonEmptyText(parsed.finalConclusion),
      keyLessons: asNonEmptyText(parsed.keyLessons),
      futureRecommendations: asNonEmptyText(parsed.futureRecommendations),
    };

    const hasAnyNarrative = Object.values(normalized).some((value) => (Array.isArray(value) ? value.length > 0 : Boolean(value)));
    if (!hasAnyNarrative) {
      const error = new Error("AI returned empty narrative for project report.");
      error.statusCode = 502;
      throw error;
    }
    return normalized;
  } catch (error) {
    console.error("[ProjectReportService] AI narrative generation failed:", error.message);
    if (!error.statusCode) {
      error.statusCode = 502;
      error.message = `Failed to generate AI narrative: ${error.message}`;
    }
    throw error;
  }
};

const buildBugRootCauseCategoriesWithAi = async ({ projectName, bugTaskFacts, qualitySignals }) => {
  if (!bugTaskFacts.length) return [];

  ensureReportAiConfigured();

  const allowedCategories = BUG_ROOT_CAUSE_LIBRARY.map((item) => item.category);
  const libraryByCategory = new Map(BUG_ROOT_CAUSE_LIBRARY.map((item) => [item.category, item]));
  const knownTaskKeys = new Set(bugTaskFacts.map((task) => task.key).filter(Boolean));

  const systemPrompt = `You are a senior QA root-cause analyst.
Output ONLY valid JSON and classify bug tasks into root-cause categories.
Rules:
- Use only the provided bug tasks and metrics.
- Category must be one of the allowed categories.
- Every category explanation must reference observed bug patterns.
- Every example must reference at least one real bug task key from input.
- Do not invent task keys or categories.`;

  const userPrompt = `Return JSON in this exact shape:
{
  "items": [
    {
      "category": "string (allowed)",
      "explanation": "string",
      "example": "string with real task key(s)",
      "evidenceTaskKeys": ["TASK-1", "TASK-2"],
      "taskCount": 0
    }
  ]
}

Allowed categories:
${JSON.stringify(allowedCategories, null, 2)}

Project:
${JSON.stringify({ projectName, qualitySignals }, null, 2)}

Bug tasks:
${JSON.stringify(bugTaskFacts, null, 2)}`;

  try {
    const response = await reportAiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response?.choices?.[0]?.message?.content || "{}");
    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

    const normalizedItems = rawItems
      .map((item) => {
        const category = asNonEmptyText(item.category);
        if (!category || !libraryByCategory.has(category)) return null;

        const evidenceTaskKeys = asTextArray(item.evidenceTaskKeys, 10).filter((key) => knownTaskKeys.has(key));
        const fallbackExample = libraryByCategory.get(category).example;
        const example = asNonEmptyText(item.example) || fallbackExample;
        const explanation = asNonEmptyText(item.explanation) || libraryByCategory.get(category).explanation;
        const taskCount = Number.isFinite(Number(item.taskCount)) ? Number(item.taskCount) : evidenceTaskKeys.length;

        return {
          category,
          explanation,
          example,
          evidenceTaskKeys,
          taskCount,
        };
      })
      .filter(Boolean)
      .slice(0, 12);

    if (!normalizedItems.length) {
      const error = new Error("AI did not return valid bug root-cause categories.");
      error.statusCode = 502;
      throw error;
    }

    return normalizedItems;
  } catch (error) {
    console.error("[ProjectReportService] AI bug root-cause classification failed:", error.message);
    if (!error.statusCode) {
      error.statusCode = 502;
      error.message = `Failed to classify bug root causes with AI: ${error.message}`;
    }
    throw error;
  }
};

const normalizeProjectKey = (projectKey) => (projectKey || "").toString().trim().toUpperCase();

const buildDatasetFingerprint = (dataset) => {
  const payload = {
    projectId: toId(dataset.project?._id || dataset.project?.id),
    projectUpdatedAt: dataset.project?.updatedAt || null,
    taskCount: toArray(dataset.tasks).length,
    sprintCount: toArray(dataset.sprints).length,
    workflowCount: toArray(dataset.workflows).length,
    userCount: toArray(dataset.users).length,
    timeLogCount: toArray(dataset.timeLogs).length,
    taskUpdateMarkers: toArray(dataset.tasks)
      .map((task) => `${toId(task._id)}:${task.updatedAt || task.createdAt || ""}`)
      .sort(),
  };

  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

const hasProjectAccess = (project, user) => {
  if (!user?._id) return false;
  if (user.role === "admin") return true;

  const userId = user._id.toString();
  const isMember = toArray(project.members).some((member) => toId(member.userId) === userId);
  if (isMember) return true;

  return toArray(project.teams).some((team) => {
    if (toId(team.leaderId) === userId) return true;
    return toArray(team.members).some((memberId) => toId(memberId) === userId);
  });
};

const ensureCompletedProject = (project) => {
  if (project?.status !== "completed") {
    const error = new Error("Project report is only available for completed projects.");
    error.statusCode = 403;
    throw error;
  }
};

const buildProjectDatasetFromDb = async ({ projectKey, projectId, user }) => {
  const query = { isDeleted: false };

  if (projectKey) {
    query.key = normalizeProjectKey(projectKey);
  } else if (projectId) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      const error = new Error("Invalid projectId format");
      error.statusCode = 400;
      throw error;
    }
    query._id = projectId;
  } else {
    const error = new Error("projectKey or projectId is required");
    error.statusCode = 400;
    throw error;
  }

  const project = await Project.findOne(query).lean();
  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  if (!hasProjectAccess(project, user)) {
    const error = new Error("You do not have access to this project");
    error.statusCode = 403;
    throw error;
  }

  ensureCompletedProject(project);

  const projectObjectId = project._id;

  const [tasks, sprints, workflows] = await Promise.all([
    Task.find({ projectId: projectObjectId }).lean(),
    Sprint.find({ projectId: projectObjectId }).lean(),
    Workflow.find({ $or: [{ projectId: projectObjectId }, { projectId: null, isDefault: true }] }).lean(),
  ]);

  const taskIds = tasks.map((task) => task._id);
  const taskTypeIds = Array.from(new Set(tasks.map((task) => toId(task.taskTypeId)).filter(Boolean)));
  const priorityIds = Array.from(new Set(tasks.map((task) => toId(task.priorityId)).filter(Boolean)));

  const assigneeIds = tasks.map((task) => toId(task.assigneeId)).filter(Boolean);
  const reporterIds = tasks.map((task) => toId(task.reporterId)).filter(Boolean);
  const projectMemberIds = toArray(project.members).map((member) => toId(member.userId));
  const teamLeaderIds = toArray(project.teams).map((team) => toId(team.leaderId));
  const teamMemberIds = toArray(project.teams).flatMap((team) => toArray(team.members).map((memberId) => toId(memberId)));

  const allUserIds = Array.from(new Set([...assigneeIds, ...reporterIds, ...projectMemberIds, ...teamLeaderIds, ...teamMemberIds].filter(Boolean)));

  const [timeLogs, taskTypes, priorities, users] = await Promise.all([
    taskIds.length > 0 ? TimeLog.find({ taskId: { $in: taskIds } }).lean() : [],
    taskTypeIds.length > 0 ? TaskType.find({ _id: { $in: taskTypeIds } }).lean() : [],
    priorityIds.length > 0 ? Priority.find({ _id: { $in: priorityIds } }).lean() : [],
    allUserIds.length > 0
      ? User.find({ _id: { $in: allUserIds } })
          .select("_id fullname username email avatar")
          .lean()
      : [],
  ]);

  return {
    project,
    sprints,
    tasks,
    users,
    taskTypes,
    priorities,
    workflows,
    timeLogs,
  };
};

const saveProjectReportSnapshot = async ({ dataset, report, user, generationMode = "manual", generationDurationMs = null }) => {
  const projectId = dataset.project?._id;
  const projectKey = normalizeProjectKey(dataset.project?.key || "");
  const projectName = dataset.project?.name || "Unnamed Project";

  const lastSnapshot = await ProjectReportSnapshot.findOne({ projectId }).sort({ version: -1 }).lean();
  const nextVersion = (lastSnapshot?.version || 0) + 1;

  await ProjectReportSnapshot.updateMany({ projectId, isLatest: true }, { isLatest: false });

  const snapshot = await ProjectReportSnapshot.create({
    projectId,
    projectKey,
    projectName,
    version: nextVersion,
    isLatest: true,
    generatedBy: user?._id || null,
    generationMode,
    dataFingerprint: buildDatasetFingerprint(dataset),
    overallScore: report?.overallScore ?? null,
    evaluation: report?.evaluation ?? null,
    confidence: report?.confidence ?? null,
    reportPayload: report,
    generatedAt: new Date(),
    generationDetails: {
      provider: reportAiApiKey ? "openai-compatible" : "none",
      model: process.env.OPENAI_MODEL || null,
      promptVersion: "project-report-v1",
      durationMs: generationDurationMs,
    },
  });

  return snapshot;
};

const getLatestProjectReportSnapshot = async ({ projectId }) => {
  return await ProjectReportSnapshot.findOne({ projectId, isLatest: true }).lean();
};

const projectReportService = {
  generateProjectReportFromProject: async ({ projectKey, projectId, user }) => {
    const startedAt = Date.now();
    const dataset = await buildProjectDatasetFromDb({ projectKey, projectId, user });
    const report = await projectReportService.generateProjectReport(dataset);
    const snapshot = await saveProjectReportSnapshot({
      dataset,
      report,
      user,
      generationMode: "manual",
      generationDurationMs: Date.now() - startedAt,
    });

    return {
      ...report,
      snapshot: {
        id: toId(snapshot._id),
        version: snapshot.version,
        generatedAt: snapshot.generatedAt,
        isLatest: true,
      },
    };
  },

  getLatestProjectReportByProject: async ({ projectKey, projectId, user }) => {
    const dataset = await buildProjectDatasetFromDb({ projectKey, projectId, user });
    const snapshot = await getLatestProjectReportSnapshot({ projectId: dataset.project._id });
    if (!snapshot) return null;

    return {
      ...snapshot.reportPayload,
      snapshot: {
        id: toId(snapshot._id),
        version: snapshot.version,
        generatedAt: snapshot.generatedAt,
        isLatest: snapshot.isLatest,
        generationMode: snapshot.generationMode,
      },
    };
  },

  generateProjectReport: async (input = {}) => {
    const project = input.project || {};
    const sprints = toArray(input.sprints);
    const tasks = toArray(input.tasks);
    const users = toArray(input.users);
    const taskTypes = toArray(input.taskTypes);
    const priorities = toArray(input.priorities);
    const workflows = toArray(input.workflows);
    const timeLogs = toArray(input.timeLogs);

    const userMap = new Map(users.map((user) => [toId(user._id || user.id || user.userId), user]));
    const taskTypeMap = new Map(taskTypes.map((taskType) => [toId(taskType._id || taskType.id), taskType]));
    const priorityMap = new Map(priorities.map((priority) => [toId(priority._id || priority.id), priority]));

    const statusMap = new Map();
    workflows.forEach((workflow) => {
      toArray(workflow.statuses).forEach((status) => {
        const statusId = toId(status._id || status.id);
        if (statusId) {
          statusMap.set(statusId, status);
        }
      });
    });

    const taskList = tasks.map((task) => {
      const statusCategory = getTaskStatusCategory(task, statusMap);
      const progress = toNumber(task.progress) ?? 0;
      const estimatedTime = toNumber(task.estimatedTime) ?? 0;
      const actualTime = toNumber(task.actualTime) ?? 0;
      const dueDate = toDate(task.dueDate);
      const completedAt = toDate(task.completedAt || task.completedDate || task.updatedAt);
      const isCompleted = statusCategory === "Done" || progress >= 100;
      const isOverdue = (() => {
        if (!dueDate) return false;
        if (isCompleted && completedAt) {
          return completedAt.getTime() > dueDate.getTime();
        }
        return !isCompleted && dueDate.getTime() < Date.now();
      })();

      return {
        raw: task,
        id: toId(task._id || task.id),
        key: task.key || task.code || task.id || task._id?.toString?.() || "N/A",
        name: task.name || "Untitled task",
        sprintId: toId(task.sprintId),
        assigneeId: toId(task.assigneeId),
        reporterId: toId(task.reporterId),
        taskTypeId: toId(task.taskTypeId),
        priorityId: toId(task.priorityId),
        statusId: toId(task.statusId),
        statusCategory,
        progress,
        estimatedTime,
        actualTime,
        dueDate,
        completedAt,
        isCompleted,
        isOverdue,
        isBug: isBugTask(task, taskTypeMap),
      };
    });

    const sprintMap = new Map(sprints.map((sprint) => [toId(sprint._id || sprint.id), sprint]));
    const sprintOrder = sprints
      .map((sprint, index) => ({ sprint, index, startDate: toDate(sprint.startDate), endDate: toDate(sprint.endDate) }))
      .sort((left, right) => {
        if (left.startDate && right.startDate) return left.startDate - right.startDate;
        if (left.startDate) return -1;
        if (right.startDate) return 1;
        return left.index - right.index;
      })
      .map((item) => item.sprint);

    const totalTasks = taskList.length;
    const completedTasks = taskList.filter((task) => task.isCompleted).length;
    const inProgressTasks = taskList.filter((task) => task.statusCategory === "In Progress" || (!task.isCompleted && task.progress > 0)).length;
    const todoTasks = taskList.filter((task) => task.statusCategory === "To Do" || task.progress === 0).length;
    const overdueTasks = taskList.filter((task) => task.isOverdue).length;
    const bugTasks = taskList.filter((task) => task.isBug);

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const overdueRate = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;

    const estimationTasks = taskList.filter((task) => task.estimatedTime > 0 && task.actualTime > 0);
    const estimationVariance = estimationTasks.length
      ? (estimationTasks.reduce((sum, task) => sum + Math.abs(task.actualTime - task.estimatedTime) / task.estimatedTime, 0) /
          estimationTasks.length) *
        100
      : 0;

    const bugDensity = totalTasks > 0 ? (bugTasks.length / totalTasks) * 100 : 0;

    const timeSpentByMember = new Map();
    timeLogs.forEach((timeLog) => {
      const userId = toId(timeLog.userId);
      const hours = toNumber(timeLog.timeSpent) ?? 0;
      if (!userId) return;
      timeSpentByMember.set(userId, (timeSpentByMember.get(userId) || 0) + hours);
    });

    const memberStats = new Map();
    users.forEach((user) => {
      const userId = toId(user._id || user.id || user.userId);
      if (!userId) return;
      memberStats.set(userId, createMemberRecord(getDisplayName(user)));
    });

    taskList.forEach((task) => {
      const memberId = task.assigneeId || task.reporterId || null;
      if (!memberId) return;
      if (!memberStats.has(memberId)) {
        const fallbackName = getDisplayName(userMap.get(memberId), memberId);
        memberStats.set(memberId, createMemberRecord(fallbackName));
      }

      const member = memberStats.get(memberId);
      member.tasks += 1;
      member.assignedEstimatedTime += task.estimatedTime || 0;
      member.assignedActualTime += task.actualTime || 0;
      member.completedTasks += task.isCompleted ? 1 : 0;
      member.overdueTasks += task.isOverdue ? 1 : 0;
      member.bugTasks += task.isBug ? 1 : 0;
      if (task.estimatedTime > 0 && task.actualTime > 0) {
        member.estimateVarianceSum += Math.abs(task.actualTime - task.estimatedTime) / task.estimatedTime;
        member.estimatedTaskCount += 1;
      }
    });

    memberStats.forEach((member, memberId) => {
      member.timeSpent = timeSpentByMember.get(memberId) || 0;
      member.averageEstimationVariance = member.estimatedTaskCount > 0 ? (member.estimateVarianceSum / member.estimatedTaskCount) * 100 : null;
      member.estimationAccuracy = member.averageEstimationVariance !== null ? clamp(100 - member.averageEstimationVariance, 0, 100) : null;
      member.workloadUnits = member.tasks + member.timeSpent;
    });

    const memberRecords = Array.from(memberStats.values());
    const activeMembers = memberRecords.filter((member) => member.tasks > 0 || member.timeSpent > 0);
    const totalWorkloadUnits = activeMembers.reduce((sum, member) => sum + member.workloadUnits, 0);
    const averageWorkloadUnits = activeMembers.length > 0 ? totalWorkloadUnits / activeMembers.length : 0;
    const workloadVariance =
      activeMembers.length > 0
        ? Math.sqrt(activeMembers.reduce((sum, member) => sum + Math.pow(member.workloadUnits - averageWorkloadUnits, 2), 0) / activeMembers.length)
        : 0;
    const workloadBalanceScore =
      activeMembers.length > 0 && averageWorkloadUnits > 0 ? clamp(100 - (workloadVariance / averageWorkloadUnits) * 100, 0, 100) : 100;

    const mostProductiveMember =
      activeMembers.slice().sort((left, right) => {
        if (right.completedTasks !== left.completedTasks) return right.completedTasks - left.completedTasks;
        if (right.tasks !== left.tasks) return right.tasks - left.tasks;
        return right.timeSpent - left.timeSpent;
      })[0] || null;

    const overloadedMembers = activeMembers.filter((member) => averageWorkloadUnits > 0 && member.workloadUnits > averageWorkloadUnits * 1.3);
    const underutilizedMembers = activeMembers.filter((member) => averageWorkloadUnits > 0 && member.workloadUnits < averageWorkloadUnits * 0.7);

    const sprintStats = sprintOrder.map((sprint, index) => {
      const sprintId = toId(sprint._id || sprint.id);
      const sprintTasks = taskList.filter((task) => task.sprintId === sprintId);
      const sprintCompleted = sprintTasks.filter((task) => task.isCompleted).length;
      const sprintDelayed = sprintTasks.filter((task) => task.isOverdue).length;
      const sprintBugs = sprintTasks.filter((task) => task.isBug).length;
      const sprintCompletionRate = sprintTasks.length > 0 ? (sprintCompleted / sprintTasks.length) * 100 : 0;
      const sprintBugDensity = sprintTasks.length > 0 ? (sprintBugs / sprintTasks.length) * 100 : 0;
      const delayedRate = sprintTasks.length > 0 ? (sprintDelayed / sprintTasks.length) * 100 : 0;
      const estimatedTasks = sprintTasks.filter((task) => task.estimatedTime > 0 && task.actualTime > 0);
      const sprintEstimationVariance = estimatedTasks.length
        ? (estimatedTasks.reduce((sum, task) => sum + Math.abs(task.actualTime - task.estimatedTime) / task.estimatedTime, 0) /
            estimatedTasks.length) *
          100
        : 0;
      const sprintScore = clamp(
        sprintCompletionRate * 0.55 + (100 - delayedRate) * 0.2 + (100 - sprintBugDensity) * 0.15 + (100 - sprintEstimationVariance) * 0.1,
        0,
        100,
      );

      return {
        sprint,
        sprintId,
        order: index,
        totalTasks: sprintTasks.length,
        completedTasks: sprintCompleted,
        completionRate: sprintCompletionRate,
        delayedTasks: sprintDelayed,
        bugTasks: sprintBugs,
        bugDensity: sprintBugDensity,
        delayedRate,
        estimationVariance: sprintEstimationVariance,
        score: sprintScore,
        durationDays: getSprintDurationDays(sprint),
      };
    });

    const bestSprint = sprintStats.slice().sort((left, right) => right.score - left.score)[0] || null;
    const worstSprint = sprintStats.slice().sort((left, right) => left.score - right.score)[0] || null;
    const mostProductiveSprint = bestSprint;

    const bugBySprint = sprintOrder.map((sprint) => {
      const sprintId = toId(sprint._id || sprint.id);
      const sprintTasks = taskList.filter((task) => task.sprintId === sprintId);
      const sprintBugs = sprintTasks.filter((task) => task.isBug).length;
      return {
        sprintId,
        sprintName: sprint.name || "Unnamed sprint",
        bugs: sprintBugs,
        totalTasks: sprintTasks.length,
        bugDensity: sprintTasks.length > 0 ? (sprintBugs / sprintTasks.length) * 100 : 0,
      };
    });

    const bugByMember = memberRecords
      .slice()
      .sort((left, right) => right.bugTasks - left.bugTasks)
      .map((member) => ({
        member: member.name,
        bugs: member.bugTasks,
      }));

    const bugByPriority = bugTasks.reduce((acc, task) => {
      const priority = getTaskPriority(task.raw, priorityMap);
      const key = priority.name || "N/A";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const recurringIssueMap = new Map();
    bugTasks.forEach((task) => {
      const key = normalizeText(task.name);
      if (!key) return;
      if (!recurringIssueMap.has(key)) {
        recurringIssueMap.set(key, { name: task.name, count: 0, sprintIds: new Set(), memberIds: new Set() });
      }
      const entry = recurringIssueMap.get(key);
      entry.count += 1;
      if (task.sprintId) entry.sprintIds.add(task.sprintId);
      if (task.assigneeId) entry.memberIds.add(task.assigneeId);
    });

    const recurringIssues = Array.from(recurringIssueMap.values())
      .filter((entry) => entry.count > 1)
      .sort((left, right) => right.count - left.count)
      .map((entry) => ({
        name: entry.name,
        count: entry.count,
        affectedSprints: entry.sprintIds.size,
        affectedMembers: entry.memberIds.size,
      }));

    const tasksExceedingEstimate = taskList.filter((task) => task.estimatedTime > 0 && task.actualTime > task.estimatedTime * 1.2);
    const highRiskSprints = sprintStats
      .filter((sprint) => sprint.totalTasks > 0 && sprint.bugDensity >= 25)
      .sort((left, right) => right.bugDensity - left.bugDensity);

    const riskItems = [];
    if (highRiskSprints.length > 0) {
      riskItems.push({
        level: "High",
        title: `Sprint ${highRiskSprints[0].sprint.name || highRiskSprints[0].sprintId} has elevated bug density (${formatPercent(highRiskSprints[0].bugDensity)})`,
      });
    }

    if (overloadedMembers.length > 0) {
      riskItems.push({
        level: "Medium",
        title: `${overloadedMembers.length} member(s) are carrying materially above-average workload`,
      });
    }

    if (tasksExceedingEstimate.length > 0) {
      riskItems.push({
        level: tasksExceedingEstimate.length >= 3 ? "High" : "Medium",
        title: `${tasksExceedingEstimate.length} task(s) exceeded their estimate by more than 20%`,
      });
    }

    if (riskItems.length === 0) {
      riskItems.push({
        level: "Low",
        title: "No dominant risk pattern is visible from the provided data",
      });
    }

    const scoreInput = {
      completionRate,
      overdueRate,
      estimationVariance,
      bugDensity,
      workloadBalanceScore,
    };
    const scoreResult = calculateScore(scoreInput);

    const evaluation = determineEvaluation(scoreResult.overallScore, completionRate);

    const projectDurationDays = sprintStats.reduce((sum, sprint) => sum + (sprint.durationDays || 0), 0);

    const tasksWithDueDate = taskList.filter((task) => task.dueDate).length;
    const tasksWithEstimates = estimationTasks.length;
    const tasksWithAssignees = taskList.filter((task) => task.assigneeId).length;

    const confidence = buildCoverageConfidence({
      hasTasks: totalTasks > 0,
      hasSprints: sprints.length > 0,
      hasUsers: users.length > 0,
      hasWorkflows: workflows.length > 0 && statusMap.size > 0,
      hasTimeLogs: timeLogs.length > 0,
      hasEstimates: tasksWithEstimates > 0,
      hasAssignees: tasksWithAssignees > 0,
    });

    const projectName = project.name || project.title || "Unnamed Project";
    const projectOverviewLine = project.description ? `${projectName}: ${project.description}` : projectName;

    const statusChart = taskList.reduce(
      (acc, task) => {
        const key = task.statusCategory || "Unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { "To Do": 0, "In Progress": 0, Done: 0 },
    );

    const tasksPerMember = {};
    const timeSpentPerMember = {};
    const workloadDistribution = {};

    memberRecords
      .slice()
      .sort((left, right) => right.tasks + right.timeSpent - (left.tasks + left.timeSpent))
      .forEach((member) => {
        tasksPerMember[member.name] = member.tasks;
        timeSpentPerMember[member.name] = Number(member.timeSpent.toFixed(2));
        workloadDistribution[member.name] = {
          tasks: member.tasks,
          timeSpent: Number(member.timeSpent.toFixed(2)),
          workloadUnits: Number(member.workloadUnits.toFixed(2)),
          workloadShare: totalWorkloadUnits > 0 ? Number(((member.workloadUnits / totalWorkloadUnits) * 100).toFixed(2)) : 0,
        };
      });

    const chartData = {
      taskStatus: statusChart,
      tasksPerMember,
      timeSpentPerMember,
      bugsPerSprint: bugBySprint.map((item) => ({
        sprint: item.sprintName,
        bugs: item.bugs,
        totalTasks: item.totalTasks,
        bugDensity: Number(item.bugDensity.toFixed(2)),
      })),
      sprintProgress: sprintStats.map((sprint) => ({
        sprint: sprint.sprint.name || "Unnamed sprint",
        totalTasks: sprint.totalTasks,
        completedTasks: sprint.completedTasks,
        completionRate: Number(sprint.completionRate.toFixed(2)),
        delayedTasks: sprint.delayedTasks,
      })),
      workloadDistribution,
    };

    const summaryRows = [
      ["Project", projectOverviewLine],
      ["Evaluation", evaluation],
      ["Tasks", totalTasks],
      ["Completed tasks", completedTasks],
      ["Completion rate", formatPercent(completionRate)],
      ["Sprints", sprints.length],
      ["Total sprint duration", formatDays(projectDurationDays)],
    ];

    const healthRows = [
      ["Completion rate", `${scoreResult.breakdown.completionScore}/100`],
      ["Overdue tasks", `${scoreResult.breakdown.overdueScore}/100`],
      ["Estimation accuracy", `${scoreResult.breakdown.estimationScore}/100`],
      ["Bug density", `${scoreResult.breakdown.bugScore}/100`],
      ["Workload balance", `${scoreResult.breakdown.workloadScore}/100`],
    ];

    const memberRows = memberRecords
      .slice()
      .sort((left, right) => right.tasks - left.tasks)
      .map((member) => [
        member.name,
        member.tasks,
        formatHours(member.timeSpent),
        member.completedTasks,
        member.estimationAccuracy === null ? "N/A" : formatPercent(member.estimationAccuracy),
      ]);

    const sprintRows = sprintStats.map((sprint) => [
      sprint.sprint.name || "Unnamed sprint",
      sprint.totalTasks,
      sprint.completedTasks,
      formatPercent(sprint.completionRate),
      sprint.delayedTasks,
    ]);

    const bugRows = bugBySprint.map((item) => [item.sprintName, item.bugs, item.totalTasks, formatPercent(item.bugDensity)]);

    const priorityRows = Object.entries(bugByPriority)
      .sort((left, right) => right[1] - left[1])
      .map(([priority, count]) => [priority, count]);

    const mostProductiveMemberName = mostProductiveMember?.name || "N/A";
    const bestSprintName = bestSprint?.sprint?.name || "N/A";
    const worstSprintName = worstSprint?.sprint?.name || "N/A";

    const timelineStart = sprintOrder[0] || null;
    const timelineMiddle = sprintOrder[Math.floor(sprintOrder.length / 2)] || null;
    const timelineEnd = sprintOrder[sprintOrder.length - 1] || null;

    const bugTaskFacts = bugTasks.slice(0, 120).map((task) => {
      const sprint = sprintMap.get(task.sprintId);
      const assignee = userMap.get(task.assigneeId);
      const priority = getTaskPriority(task.raw, priorityMap);
      return {
        key: task.key,
        name: task.name,
        sprint: sprint?.name || "Backlog/Unknown",
        assignee: getDisplayName(assignee, "Unassigned"),
        priority: priority.name,
        status: task.statusCategory,
        isOverdue: task.isOverdue,
        estimatedTime: task.estimatedTime,
        actualTime: task.actualTime,
        progress: task.progress,
      };
    });

    const rootCauseCategories = await buildBugRootCauseCategoriesWithAi({
      projectName,
      bugTaskFacts,
      qualitySignals: {
        bugTasks: bugTasks.length,
        bugDensity: Number(bugDensity.toFixed(2)),
        overdueRate: Number(overdueRate.toFixed(2)),
        estimationVariance: Number(estimationVariance.toFixed(2)),
        recurringIssues: recurringIssues.length,
      },
    });

    const rootCauseCategoryRows = rootCauseCategories.map((item) => [
      item.taskCount > 0 ? `${item.category} (${item.taskCount} bug task${item.taskCount > 1 ? "s" : ""})` : item.category,
      item.explanation,
      item.evidenceTaskKeys?.length ? `${item.example} [Evidence: ${item.evidenceTaskKeys.join(", ")}]` : item.example,
    ]);

    const aiNarrative = await buildNarrativeWithAi({
      project: {
        name: projectName,
        evaluation,
        overallScore: scoreResult.overallScore,
      },
      summary: {
        totalTasks,
        completedTasks,
        completionRate: Number(completionRate.toFixed(2)),
        overdueTasks,
        overdueRate: Number(overdueRate.toFixed(2)),
        totalSprints: sprints.length,
      },
      sprintInsights: {
        timelineStart: timelineStart?.name || null,
        timelineMiddle: timelineMiddle?.name || null,
        timelineEnd: timelineEnd?.name || null,
        bestSprint: bestSprintName,
        worstSprint: worstSprintName,
        mostProductiveSprint: mostProductiveSprint?.sprint?.name || "N/A",
      },
      qualitySignals: {
        bugTasks: bugTasks.length,
        bugDensity: Number(bugDensity.toFixed(2)),
        estimationVariance: Number(estimationVariance.toFixed(2)),
        tasksExceedingEstimate: tasksExceedingEstimate.length,
        overloadedMembers: overloadedMembers.length,
        recurringIssues: recurringIssues.length,
      },
      rootCauseCategories: rootCauseCategories.map((item) => ({
        category: item.category,
        taskCount: item.taskCount,
        evidenceTaskKeys: item.evidenceTaskKeys,
      })),
      risks: riskItems,
    });

    const narrativeBeginning = aiNarrative.timelineBeginning;
    const narrativeDevelopment = aiNarrative.timelineDevelopment;
    const narrativeChallenges = aiNarrative.timelineChallenges;
    const narrativeCompletion = aiNarrative.timelineCompletion;
    const productivityReason = aiNarrative.productivityReason;
    const rootCauseReasons = aiNarrative.rootCauseAnalysis;
    const recommendationItems = aiNarrative.recommendations;
    const finalConclusion = aiNarrative.finalConclusion;
    const keyLessons = aiNarrative.keyLessons;
    const futureRecommendations = aiNarrative.futureRecommendations;

    const reportMarkdown = [
      `# Complete Project Report`,
      ``,
      `## 1. Executive Summary`,
      buildTable(["Metric", "Value"], summaryRows),
      ``,
      `Key achievements:`,
      buildBulletList([
        `Best sprint: ${bestSprintName}`,
        `Most productive member: ${mostProductiveMemberName}`,
        `Completion rate reached ${formatPercent(completionRate)}`,
      ]),
      ``,
      `Overall evaluation: **${evaluation}**`,
      ``,
      `## 2. Project Health Score`,
      `Overall score: **${scoreResult.overallScore}/100**`,
      buildTable(["Factor", "Score"], healthRows),
      ``,
      `## 3. Team Performance Analysis`,
      buildTable(["Member", "Tasks", "Time Spent", "Completed", "Estimation Accuracy"], memberRows),
      ``,
      `## 4. Workload Analysis`,
      `Balance level: **${workloadBalanceScore >= 80 ? "Balanced" : workloadBalanceScore >= 60 ? "Slightly uneven" : "Highly uneven"}**`,
      `Workload balance score: **${Math.round(workloadBalanceScore)}/100**`,
      ``,
      `## 5. Issue (Bug) Analysis`,
      `Total bugs: **${bugTasks.length}**`,
      buildTable(["Sprint", "Bugs", "Total Tasks", "Bug Density"], bugRows),
      ``,
      `Bug severity by priority:`,
      buildTable(["Priority", "Bug Count"], priorityRows),
      ``,
      `### Bug Root Cause Categories`,
      buildTable(["Root Cause Category", "Explanation", "Example"], rootCauseCategoryRows),
      ``,
      `## 6. Risk Detection`,
      buildBulletList(riskItems.map((item) => `[${item.level}] ${item.title}`)),
      ``,
      `## 7. Sprint Analysis`,
      buildTable(["Sprint", "Total Tasks", "Completed Tasks", "Completion Rate", "Delayed Tasks"], sprintRows),
      ``,
      `Best sprint: **${bestSprintName}**`,
      `Worst sprint: **${worstSprintName}**`,
      ``,
      `## 8. Timeline Narrative`,
      `Beginning: ${narrativeBeginning}`,
      ``,
      `Development: ${narrativeDevelopment}`,
      ``,
      `Challenges: ${narrativeChallenges}`,
      ``,
      `Completion: ${narrativeCompletion}`,
      ``,
      `## 9. Productivity Insight`,
      `Most productive sprint: **${mostProductiveSprint?.sprint?.name || "N/A"}**`,
      `Reason: ${productivityReason}`,
      ``,
      `## 10. Root Cause Analysis`,
      buildBulletList(rootCauseReasons, "No clear root-cause pattern was visible from the supplied data."),
      ``,
      `## 11. Recommendations`,
      buildBulletList(recommendationItems),
      ``,
      `## 12. Chart Data`,
      "Use the JSON block at the end of this report for charts and dashboard widgets.",
      ``,
      `## 13. Final Conclusion`,
      finalConclusion,
      `Key lessons: ${keyLessons}`,
      `Future recommendations: ${futureRecommendations}`,
      ``,
      `## 14. AI Confidence Score`,
      `Confidence: **${confidence}%**`,
      `Reason: the report uses the provided tasks, sprints, users, priorities, task types, workflows, and time logs, but the confidence is reduced when estimate, assignee, or workflow coverage is incomplete.`,
    ].join("\n");

    return {
      project: {
        id: toId(project._id || project.id),
        name: projectName,
      },
      evaluation,
      overallScore: scoreResult.overallScore,
      healthScoreBreakdown: scoreResult.breakdown,
      summary: {
        totalTasks,
        completedTasks,
        completionRate: Number(completionRate.toFixed(2)),
        totalSprints: sprints.length,
        totalSprintDurationDays: Number(projectDurationDays.toFixed(2)),
      },
      analytics: {
        inProgressTasks,
        todoTasks,
        overdueTasks,
        bugTasks: bugTasks.length,
        tasksWithDueDate,
        tasksWithEstimates,
        tasksWithAssignees,
      },
      team: {
        mostProductiveMember: mostProductiveMemberName,
        overloadedMembers: overloadedMembers.map((member) => member.name),
        underutilizedMembers: underutilizedMembers.map((member) => member.name),
      },
      sprintInsights: {
        bestSprint: bestSprint?.sprint?.name || null,
        worstSprint: worstSprint?.sprint?.name || null,
        mostProductiveSprint: mostProductiveSprint?.sprint?.name || null,
      },
      bugAnalysis: {
        totalBugs: bugTasks.length,
        bugsPerSprint: bugBySprint,
        bugsPerMember: bugByMember,
        bugsByPriority: bugByPriority,
        recurringIssues,
        rootCauseCategories,
      },
      risks: riskItems,
      chartData,
      markdown: `${reportMarkdown}\n\n\`\`\`json\n${JSON.stringify(chartData, null, 2)}\n\`\`\``,
      confidence,
    };
  },
};

module.exports = projectReportService;
