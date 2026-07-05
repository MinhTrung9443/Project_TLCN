const aiAssistantService = require("../services/AIAssistantService");
const User = require("../models/User");
const Project = require("../models/Project");
const Sprint = require("../models/Sprint");
const Platform = require("../models/Platform");
const Priority = require("../models/Priority");
const TaskType = require("../models/TaskType");
const Workflow = require("../models/Workflow");
const taskService = require("../services/TaskService");
const aiTaskBatchService = require("../services/AITaskBatchService");
const AIChatSession = require("../models/AIChatSession");
const AIChatMessage = require("../models/AIChatMessage");
const { normalizeProjectStatus } = require("../utils/taskPermission");

const formatDateVN = (dateValue) => {
  if (!dateValue) return "Chưa có";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return date.toISOString().split("T")[0];
};

const getTaskAssigneeLabel = (task) => task.assigneeId?.fullname || task.assigneeId?.email || "Chưa giao";

const formatTaskLink = (task) => `[${task.name || task.taskName || task.key || "Xem task"}](/app/task/${task.key})`;

const formatTaskListMarkdown = (tasks, options = {}) => {
  const title = options.title || "Danh sách task";
  const projectLabel = options.projectName ? ` trong dự án **${options.projectName}**` : "";
  const statusLabel = options.projectStatus ? ` (${options.projectStatus})` : "";

  if (!tasks || tasks.length === 0) {
    return `Hiện tại không có task nào thỏa mãn điều kiện${projectLabel}${statusLabel}.`;
  }

  const visibleTasks = tasks.slice(0, 10);
  const lines = visibleTasks.map((task) => {
    const projectName = task.projectId?.name || task.projectName || "N/A";
    const status = task.statusId?.name || task.statusId?.category || task.status || "N/A";
    const assignee = getTaskAssigneeLabel(task);
    const dueDate = formatDateVN(task.dueDate);
    return `- ${formatTaskLink(task)} | Dự án: **${projectName}** | Giao cho: **${assignee}** | Trạng thái: **${status}** | Hạn: **${dueDate}**`;
  });

  const remainingCount = tasks.length - visibleTasks.length;

  return `${title}${projectLabel}${statusLabel}:
Tôi tìm thấy **${tasks.length}** task phù hợp${remainingCount > 0 ? `, đang hiển thị **${visibleTasks.length}** task gần nhất` : ""}.
${lines.join("\n")}${remainingCount > 0 ? `\n\nCòn **${remainingCount}** task nữa, nếu bạn muốn tôi có thể liệt kê tiếp.` : ""}`;
};

const formatProjectListMarkdown = (projects, options = {}) => {
  const title = options.title || "Danh sách dự án";
  const statusLabel = options.projectStatus ? ` (${options.projectStatus})` : "";

  if (!projects || projects.length === 0) {
    return `Hiện tại không có dự án nào thỏa mãn điều kiện${statusLabel}.`;
  }

  const lines = projects.map((project) => {
    const role = project.role || "MEMBER";
    const status = project.status || "active";
    return `- **${project.name}** | Trạng thái: **${status}** | Vai trò của bạn: **${role}**`;
  });

  return `${title}${statusLabel}:
Tôi tìm thấy **${projects.length}** dự án phù hợp.
${lines.join("\n")}`;
};

const formatTaskDetailMarkdown = (task) => {
  if (!task) return "Không tìm thấy task phù hợp.";

  const projectName = task.projectId?.name || task.projectName || "N/A";
  const assignee = getTaskAssigneeLabel(task);
  const reporter = task.reporterId?.fullname || task.reporterId?.email || "N/A";
  const createdBy = task.createdById?.fullname || task.createdById?.email || "N/A";
  const priority = task.priorityId?.name || task.priorityId?.level || task.priority || "N/A";
  const taskType = task.taskTypeId?.name || task.taskType || "N/A";
  const status = task.statusId?.name || task.statusId?.category || task.status || "N/A";
  const dueDate = formatDateVN(task.dueDate);
  const progress = typeof task.progress === "number" ? `${task.progress}%` : "0%";

  return [
    `Chi tiết task: ${formatTaskLink(task)}`,
    `- Mã task: **${task.key || "N/A"}**`,
    `- Dự án: **${projectName}**`,
    `- Người được giao: **${assignee}**`,
    `- Người tạo: **${reporter}**`,
    `- Người khởi tạo hệ thống: **${createdBy}**`,
    `- Ưu tiên: **${priority}**`,
    `- Loại task: **${taskType}**`,
    `- Trạng thái: **${status}**`,
    `- Tiến độ: **${progress}**`,
    `- Hạn: **${dueDate}**`,
  ].join("\n");
};

const getOrCreateSession = async ({ sessionId, userId, title }) => {
  let session;

  if (sessionId) {
    session = await AIChatSession.findOne({ _id: sessionId, user: userId });
    if (!session) {
      const error = new Error("Phiên chat không tồn tại hoặc bạn không có quyền truy cập.");
      error.statusCode = 404;
      throw error;
    }
    return session;
  }

  return AIChatSession.create({ user: userId, title });
};

const persistAssistantTurn = async (sessionId, userText, assistantText) => {
  await AIChatMessage.create({ session: sessionId, role: "user", content: userText });
  await AIChatMessage.create({ session: sessionId, role: "assistant", content: assistantText });
};

const getSessions = async (req, res) => {
  try {
    const sessions = await AIChatSession.find({ user: req.user.id }).sort({ updatedAt: -1 }).limit(20);
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Lỗi tải phiên chat" });
  }
};

const createSession = async (req, res) => {
  try {
    const session = await AIChatSession.create({ user: req.user.id, title: "Cuộc trò chuyện mới" });
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo phiên chat" });
  }
};

const getSessionMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await AIChatSession.findOne({ _id: sessionId, user: req.user.id });
    if (!session) return res.status(404).json({ message: "Không tìm thấy" });
    const messages = await AIChatMessage.find({ session: sessionId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Lỗi tải tin nhắn" });
  }
};

const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    await AIChatSession.findOneAndDelete({ _id: sessionId, user: req.user.id });
    await AIChatMessage.deleteMany({ session: sessionId });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xoá phiên chat" });
  }
};

const handleAnalyzeRisk = async (req, res) => {
  try {
    const { targetProjectName, question, history, sessionId } = req.body;
    const userId = req.user.id;

    let session;
    // Nếu có sessionId, ta phải tìm và dùng nó
    if (sessionId) {
      session = await AIChatSession.findOne({ _id: sessionId, user: userId });
      if (!session) {
        return res.status(404).json({ message: "Phiên chat không tồn tại hoặc bạn không có quyền truy cập." });
      }
    } else {
      // Nếu không có sessionId, tạo phiên mới
      const displayTitle = question ? question.substring(0, 30) + "..." : "Phân tích rủi ro";
      session = await AIChatSession.create({ user: userId, title: displayTitle });
    }

    // Xây dựng chuỗi ngữ cảnh từ history của session (chỉ lấy tối đa 5 tin nhắn gần nhất)
    const conversationHistory = await AIChatMessage.find({ session: session._id }).sort({ createdAt: -1 }).limit(5);
    const historyForAI = conversationHistory.map((msg) => ({ role: msg.role, content: msg.content })).reverse();

    const assistantIntent = await aiAssistantService.parseAssistantIntent(question, historyForAI);
    const intentParams = assistantIntent?.params || {};
    const intent = intentParams.intent || "unknown";

    if (intent === "create_task" || intentParams.createTaskIntent) {
      req.body.command = question;
      req.body.historyForAI = historyForAI;
      req.body.sessionId = session._id;
      return handleChatCommand(req, res);
    }

    if (intent === "query_tasks") {
      const user = await User.findById(userId);
      const isSystemAdmin = user?.role === "admin";
      const scope = intentParams.scope || "assigned";
      const requestedProjectStatus = normalizeProjectStatus(intentParams.projectStatus || "active");
      const requestedProjectName = intentParams.projectName?.trim();
      const requestedTaskKey = intentParams.taskKey?.trim();

      if (requestedTaskKey) {
        let task;
        try {
          task = await taskService.getTaskByKey(requestedTaskKey, req.user);
        } catch (taskError) {
          const response =
            taskError.statusCode === 403
              ? "Bạn không có quyền xem task này."
              : taskError.statusCode === 410
                ? `Task **${requestedTaskKey}** đã bị xóa hoặc project không còn khả dụng.`
                : `Không tìm thấy task **${requestedTaskKey}**.`;
          await AIChatMessage.create({ session: session._id, role: "user", content: question });
          await AIChatMessage.create({ session: session._id, role: "assistant", content: response });
          session.updatedAt = new Date();
          await session.save();
          return res.status(taskError.statusCode || 404).json({ recommendation: response, sessionId: session._id });
        }

        const response = formatTaskDetailMarkdown(task);
        await AIChatMessage.create({ session: session._id, role: "user", content: question });
        await AIChatMessage.create({ session: session._id, role: "assistant", content: response });
        session.updatedAt = new Date();
        await session.save();
        return res.status(200).json({ recommendation: response, sessionId: session._id });
      }

      const searchParams = {
        projectStatus: requestedProjectStatus,
        managedOnly: scope === "managed",
      };

      if (requestedProjectName) {
        const project = await Project.findOne({ isDeleted: false, name: new RegExp(requestedProjectName, "i") });
        if (!project) {
          const response = `Không tìm thấy dự án **${requestedProjectName}**.`;
          await AIChatMessage.create({ session: session._id, role: "user", content: question });
          await AIChatMessage.create({ session: session._id, role: "assistant", content: response });
          session.updatedAt = new Date();
          await session.save();
          return res.status(200).json({ recommendation: response, sessionId: session._id });
        }

        if (!isSystemAdmin && requestedProjectStatus !== "any" && project.status !== requestedProjectStatus) {
          const response = `Dự án **${project.name}** không ở trạng thái **${requestedProjectStatus}** nên không được lấy theo mặc định.`;
          await AIChatMessage.create({ session: session._id, role: "user", content: question });
          await AIChatMessage.create({ session: session._id, role: "assistant", content: response });
          session.updatedAt = new Date();
          await session.save();
          return res.status(200).json({ recommendation: response, sessionId: session._id });
        }

        searchParams.projectId = project._id.toString();
        searchParams.projectName = project.name;
      }

      const tasks = await taskService.searchTasks(searchParams, req.user);
      const response = formatTaskListMarkdown(tasks, {
        title: scope === "managed" ? "Các task bạn đang quản lý" : "Các task được giao cho bạn",
        projectName: searchParams.projectName,
        projectStatus: searchParams.projectStatus,
      });

      await AIChatMessage.create({ session: session._id, role: "user", content: question });
      await AIChatMessage.create({ session: session._id, role: "assistant", content: response });
      session.updatedAt = new Date();
      await session.save();

      return res.status(200).json({ recommendation: response, sessionId: session._id });
    }

    if (intent === "query_projects") {
      const user = await User.findById(userId);
      const isSystemAdmin = user?.role === "admin";
      const requestedProjectStatus = normalizeProjectStatus(intentParams.projectStatus || "active");

      const projectQuery = {
        isDeleted: false,
      };

      if (!isSystemAdmin) {
        projectQuery.$or = [{ "members.userId": userId }, { "teams.leaderId": userId }, { "teams.members": userId }];
      }

      if (requestedProjectStatus !== "any") {
        projectQuery.status = requestedProjectStatus;
      }

      const userProjects = await Project.find(projectQuery).lean();
      const projectList = userProjects.map((project) => {
        let role = "MEMBER";
        const memberObj = project.members?.find((m) => m.userId?.toString() === userId.toString());
        if (memberObj) {
          role = memberObj.role;
        } else if (project.teams?.some((t) => t.leaderId?.toString() === userId.toString())) {
          role = "LEADER";
        }

        return {
          name: project.name,
          status: project.status || "active",
          role,
        };
      });

      const response = formatProjectListMarkdown(projectList, {
        title: "Danh sách dự án bạn đang tham gia",
        projectStatus: requestedProjectStatus,
      });

      await AIChatMessage.create({ session: session._id, role: "user", content: question });
      await AIChatMessage.create({ session: session._id, role: "assistant", content: response });
      session.updatedAt = new Date();
      await session.save();

      return res.status(200).json({ recommendation: response, sessionId: session._id });
    }

    if (intent === "analyze_project" || intent === "unknown" || intent === "chat") {
      // 1. Kiểm tra Quyền truy cập (RBAC) của User
      const user = await User.findById(userId);
      const isSystemAdmin = user?.role === "admin";

      // Lấy danh sách dự án user đang tham gia và gán vai trò (chỉ lấy dự án active nếu user không nói rõ completed)
      const userProjects = await Project.find({
        isDeleted: false,
        status: "active",
        $or: [{ "members.userId": userId }, { "teams.leaderId": userId }, { "teams.members": userId }],
      }).lean();

      const allowedProjectIds = userProjects.map((p) => p._id);
      const userRolesInProjects = userProjects.map((p) => {
        let role = "MEMBER";
        const memberObj = p.members?.find((m) => m.userId?.toString() === userId.toString());
        if (memberObj) {
          role = memberObj.role;
        } else {
          const isTeamLeader = p.teams?.some((t) => t.leaderId?.toString() === userId.toString());
          if (isTeamLeader) role = "LEADER";
        }
        return { projectName: p.name, role: role };
      });

      // 2. Trích xuất thông tin User để AI nắm ngữ cảnh quyền hạn
      const userInfo = {
        fullName: req.user.fullName || req.user.username || user?.fullname,
        email: req.user.email || user?.email,
        isSystemAdmin: isSystemAdmin,
        projectRoles: userRolesInProjects,
      };

      // 3. Build Query lấy Task
      let query = {};
      if (intentParams.projectName) {
        const project = await Project.findOne({ isDeleted: false, name: new RegExp(intentParams.projectName, "i") });
        if (!project) {
          return res.status(404).json({ message: "Không tìm thấy dự án này trong Database." });
        }

        // Nếu không phải admin thì phải được cấp quyền trong dự án (nằm trong allowedProjectIds)
        if (!isSystemAdmin) {
          const hasAccess = allowedProjectIds.some((id) => id.toString() === project._id.toString());
          if (!hasAccess) {
            return res.status(403).json({ message: "Bạn không có quyền truy cập thông tin dự án này." });
          }
        }
        query.projectId = project._id;
      } else {
        // Lấy tất cả dự án -> Nhưng bị giới hạn bởi quyền (nếu không phải admin)
        if (!isSystemAdmin) {
          if (allowedProjectIds.length === 0) {
            return res.status(200).json({ recommendation: "Hiện tại bạn chưa được phân công vào dự án active nào nên không có task." });
          }
          query.projectId = { $in: allowedProjectIds };
        }
      }

      // 4. Lấy toàn bộ Task từ DB liên quan tới những dự án User CÓ QUYỀN
      const maxTasksForAI = Number(process.env.AI_ANALYSIS_TASK_LIMIT || 300);
      const dbTasks = await require("../models/Task")
        .find(query)
        .select("key name assigneeId projectId statusId priorityId taskTypeId platformId dueDate progress")
        .populate("assigneeId", "fullname email")
        .populate("projectId", "name status")
        .populate("priorityId", "name level")
        .populate("taskTypeId", "name")
        .populate("platformId", "name")
        .sort({ updatedAt: -1 })
        .limit(Number.isFinite(maxTasksForAI) && maxTasksForAI > 0 ? maxTasksForAI : 300)
        .lean();

      // Resolve statusId qua workflow theo projectId
      const projectIds = [...new Set(dbTasks.map((task) => task.projectId?._id?.toString()).filter(Boolean))];
      const workflows = projectIds.length > 0 ? await Workflow.find({ projectId: { $in: projectIds } }) : [];
      const workflowMap = new Map(workflows.map((wf) => [wf.projectId.toString(), wf]));

      const tasksWithResolvedStatus = dbTasks.map((task) => {
        if (!task.projectId || !task.statusId) return task;
        const workflow = workflowMap.get(task.projectId._id.toString());
        if (workflow && Array.isArray(workflow.statuses)) {
          const resolvedStatus = workflow.statuses.find((status) => status._id.toString() === task.statusId.toString());
          if (resolvedStatus) {
            task.statusId = resolvedStatus;
          }
        }
        return task;
      });

      // Debug log: Đếm số lượng task thực tế trả về từ DB
      console.log("[AI DEBUG] Tổng số task lấy được từ DB:", dbTasks.length);
      if (query.projectId) {
        console.log("[AI DEBUG] Đang filter theo projectId:", query.projectId);
        if (Array.isArray(dbTasks)) {
          const projectNames = dbTasks.map((t) => t.projectId && t.projectId.name).filter(Boolean);
          console.log("[AI DEBUG] Danh sách projectName thực tế:", projectNames);
        }
      }

      // Xóa đoạn return sớm nếu không có task, để AI có cơ hội trả lời câu hỏi thông thường
      const taskListToMap = tasksWithResolvedStatus || [];

      // 5. Format lại Data cho ngắn gọn trước khi gửi cho AI (Tránh tốn token)
      const formattedData = taskListToMap.map((task) => ({
        taskName: task.name,
        projectName: task.projectId?.name || "N/A",
        projectStatus: task.projectId?.status || "active",
        assignee: task.assigneeId?.fullname || task.assigneeId?.email || "Chưa giao cho ai",
        priority: task.priorityId?.level + "-" + task.priorityId?.name || "N/A",
        taskType: task.taskTypeId?.name || "N/A",
        platform: task.platformId?.name || "N/A",
        status: task.statusId?.name || task.statusId?.category || "N/A",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : null,
        isOverdue: task.dueDate && new Date(task.dueDate) < new Date(),
        progress: task.progress || 0,
        taskKey: task.key,
        taskLink: task.key ? `http://localhost:3000/app/task/${task.key}` : null,
      }));
      // Danh sách dự án user tham gia (dù có task hay không)
      const allUserProjects = userProjects.map((p) => ({
        projectName: p.name,
        status: p.status || "active",
        role: userRolesInProjects.find((r) => r.projectName === p.name)?.role || "MEMBER",
      }));
      console.log("[AI DEBUG] Dữ liệu gửi cho AI (số lượng task):", formattedData);
      const projectDataPayload = {
        currentDate: new Date().toISOString().split("T")[0],
        warning: "Danh sách này chỉ là dữ liệu đã được backend lọc theo quyền. AI không được mở rộng phạm vi truy cập.",
        totalTasksAcrossAllAllowedProjects: formattedData.length,
        tasks: formattedData,
        projects: allUserProjects,
      };

      // Thêm câu hỏi của user vào history trước khi gửi đi
      historyForAI.push({ role: "user", content: question });
      const analysisResult = await aiAssistantService.analyzeProjectRisk(projectDataPayload, question, userInfo, historyForAI);

      // Lưu tin nhắn user và assistant vào DB
      await AIChatMessage.create({ session: session._id, role: "user", content: question });
      await AIChatMessage.create({ session: session._id, role: "assistant", content: analysisResult });

      // Cập nhật thời gian cho session
      session.updatedAt = new Date();
      await session.save();

      res.status(200).json({ recommendation: analysisResult, sessionId: session._id });
      return;
    }

    // Lệnh không hiểu sẽ không bao giờ lọt xuống đây nữa vì đã được gom vào if phía trên.
  } catch (error) {
    console.error("Analysis Controller Error:", error);

    let errorMsg = "Lỗi hệ thống khi AI phân tích rủi ro.";
    const is402 =
      error &&
      (error.status === 402 ||
        error.code === 402 ||
        (error.error && (error.error.code === 402 || error.error.status === 402)) ||
        (error.message && error.message.includes("402")));
    const is429 = error && (error.status === 429 || (error.message && error.message.includes("429")));
    if (is402) {
      errorMsg = "API Key của dịch vụ AI đã hết Token hoặc quá giới hạn hạn mức (Credits). Vui lòng nạp thêm API để tiếp tục!";
    } else if (is429) {
      errorMsg = "Đã vượt quá giới hạn lượt dùng API miễn phí (Rate Limit) của Gemini. Vui lòng thử lại sau vài phút.";
    }

    const fallbackSessionId = typeof session !== "undefined" && session?._id ? session._id : req.body.sessionId;

    res.status(200).json({
      recommendation: errorMsg,
      sessionId: fallbackSessionId,
    });
  }
};

const handleChatCommand = async (req, res) => {
  try {
    const { command, sessionId, historyForAI } = req.body;
    const userId = req.user.id;

    const session = await getOrCreateSession({
      sessionId,
      userId,
      title: `Tạo task: ${(command || "").substring(0, 30)}`,
    });

    const parsedCommands = await aiAssistantService.parseTaskCommand(command, historyForAI || []);
    const taskInputs = (parsedCommands || []).map((item) => item.params).filter(Boolean);

    if (taskInputs.length === 0) {
      const response = "Không hiểu lệnh hoặc chưa hỗ trợ lệnh này.";
      await persistAssistantTurn(session._id, command, response);
      session.updatedAt = new Date();
      await session.save();
      return res.status(200).json({ recommendation: response, sessionId: session._id });
    }

    const currentUser = await User.findById(userId);
    const batchResult = await aiTaskBatchService.processTaskInputs(taskInputs, currentUser, {
      sourceLabel: "Từ prompt",
    });

    const aiResponse = batchResult.responseText || "Bạn muốn tạo công việc mới nhưng chưa cung cấp đủ thông tin hợp lệ.";

    await persistAssistantTurn(session._id, command, aiResponse);

    if (batchResult.createdRows.length === 1) {
      session.title = `Tạo task: ${batchResult.createdRows[0].task.name}`;
    } else if (batchResult.createdRows.length > 1) {
      session.title = `Tạo ${batchResult.createdRows.length} tasks`;
    }
    session.updatedAt = new Date();
    await session.save();

    res.status(200).json({
      recommendation: aiResponse,
      sessionId: session._id,
      taskKey: batchResult.createdRows.length > 0 ? batchResult.createdRows[0].task.key : null,
      results: {
        created: batchResult.createdRows,
        failed: batchResult.failedRows,
        summary: batchResult.summaryText,
      },
    });
  } catch (error) {
    console.error("Chat Command Controller Error:", error);
    let errorMsg = `Lỗi hệ thống khi tạo task: ${error.message}`;
    if (error.message && error.message.includes("402")) {
      errorMsg = "Lỗi khi tạo task: API Key AI của bạn đã hết hạn mức Token.";
    } else if (error.message && error.message.includes("429")) {
      errorMsg = "Lỗi khi tạo task: Đã vượt quá giới hạn Rate Limit của Gemini. Vui lòng thử lại sau.";
    }

    const fallbackSessionId = typeof session !== "undefined" && session?._id ? session._id : req.body.sessionId;

    res.status(200).json({ recommendation: errorMsg, sessionId: fallbackSessionId });
  }
};

const handleImportTasks = async (req, res) => {
  try {
    const { tasks, sessionId, fileName } = req.body;
    const userId = req.user.id;

    const session = await getOrCreateSession({
      sessionId,
      userId,
      title: `Import task: ${(fileName || "danh sách").substring(0, 30)}`,
    });

    const currentUser = await User.findById(userId);
    const batchResult = await aiTaskBatchService.processTaskInputs(tasks, currentUser, {
      sourceLabel: fileName ? `File ${fileName}` : "Import file",
    });

    const aiResponse = batchResult.responseText || "Không có task nào được tạo từ dữ liệu đã import.";

    await persistAssistantTurn(session._id, fileName ? `Import file: ${fileName}` : "Import file task", aiResponse);

    if (batchResult.createdRows.length === 1) {
      session.title = `Import task: ${batchResult.createdRows[0].task.name}`;
    } else if (batchResult.createdRows.length > 1) {
      session.title = `Import ${batchResult.createdRows.length} tasks`;
    }
    session.updatedAt = new Date();
    await session.save();

    res.status(200).json({
      recommendation: aiResponse,
      sessionId: session._id,
      results: {
        created: batchResult.createdRows,
        failed: batchResult.failedRows,
        summary: batchResult.summaryText,
      },
    });
  } catch (error) {
    console.error("Import Tasks Controller Error:", error);
    const fallbackSessionId = typeof session !== "undefined" && session?._id ? session._id : req.body.sessionId;
    res.status(200).json({ recommendation: `Lỗi hệ thống khi import task: ${error.message}`, sessionId: fallbackSessionId });
  }
};

module.exports = {
  getSessions,
  createSession,
  getSessionMessages,
  deleteSession,
  handleAnalyzeRisk,
  handleChatCommand,
  handleImportTasks,
};
