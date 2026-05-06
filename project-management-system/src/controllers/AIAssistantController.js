const aiAssistantService = require("../services/AIAssistantService");
const User = require("../models/User");
const Project = require("../models/Project");
const Sprint = require("../models/Sprint");
const Platform = require("../models/Platform");
const Priority = require("../models/Priority");
const TaskType = require("../models/TaskType");
const Workflow = require("../models/Workflow");
const taskService = require("../services/TaskService");
const AIChatSession = require("../models/AIChatSession");
const AIChatMessage = require("../models/AIChatMessage");


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

    // Xây dựng chuỗi ngữ cảnh từ history của session (chỉ lấy tối đa 8 tin nhắn gần nhất)
    const conversationHistory = await AIChatMessage.find({ session: session._id })
      .sort({ createdAt: -1 })
      .limit(8);
    const historyForAI = conversationHistory.map(msg => ({ role: msg.role, content: msg.content })).reverse();

    const lastAssistantMessage = historyForAI.length > 0 && historyForAI[historyForAI.length - 1].role === "assistant" 
      ? historyForAI[historyForAI.length - 1].content 
      : "";

    const lastUserMessage = historyForAI.length > 1 && historyForAI[historyForAI.length - 2].role === "user"
      ? historyForAI[historyForAI.length - 2].content
      : "";

    const inTaskCreationContext = /chưa cung cấp tên công việc|chưa cung cấp tên dự án|không tìm thấy dự án hoặc bạn chưa/i.test(lastAssistantMessage);

    const isQuestion = /\b(tại sao|sao lại|vì sao|đâu|bao nhiêu|giải thích|làm thế nào|như thế nào|hả)\b/i.test(question) || question.trim().endsWith("?");
    const hasCreateKeywords = /\b(tạo|thêm|add|create|make|giao|phân)\b/i.test(question) && /\b(task|công việc|việc)\b/i.test(question);
    const isTaskCreation = (hasCreateKeywords && !isQuestion) || inTaskCreationContext;

    if (isTaskCreation) {
      req.body.command = question; 
      req.body.historyForAI = historyForAI; 
      req.body.sessionId = session._id; 
      return handleChatCommand(req, res);
    }

    // 1. Kiểm tra Quyền truy cập (RBAC) của User
    const user = await User.findById(userId);
    const isSystemAdmin = user?.role === "admin";

    // Lấy danh sách dự án user đang tham gia và gán vai trò (chỉ lấy dự án chưa bị xóa mềm)
    const userProjects = await Project.find({
      isDeleted: false,
      $or: [
        { "members.userId": userId },
        { "teams.leaderId": userId },
        { "teams.members": userId }
      ],
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
    if (targetProjectName) {
      const project = await Project.findOne({ name: new RegExp(targetProjectName, "i") });
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
          return res.status(200).json({ recommendation: "Hiện tại bạn chưa được phân công vào dự án nào nên không có task." });
        }
        query.projectId = { $in: allowedProjectIds };
      }
    }

    // 4. Lấy toàn bộ Task từ DB liên quan tới những dự án User CÓ QUYỀN
    const maxTasksForAI = Number(process.env.AI_ANALYSIS_TASK_LIMIT || 300);
    const dbTasks = await require("../models/Task")
      .find(query)
      .select("name assigneeId projectId statusId priorityId taskTypeId platformId dueDate progress")
      .populate("assigneeId", "fullName email")
      .populate("projectId", "name")
      .populate("statusId", "name category") // Thường workflow status lưu string hoặc object
      .populate("priorityId", "name level")
      .populate("taskTypeId", "name")
      .populate("platformId", "name")
      .sort({ updatedAt: -1 })
      .limit(Number.isFinite(maxTasksForAI) && maxTasksForAI > 0 ? maxTasksForAI : 300)
      .lean();

    // Debug log: Đếm số lượng task thực tế trả về từ DB
    console.log("[AI DEBUG] Tổng số task lấy được từ DB:", dbTasks.length);
    if (query.projectId) {
      // Nếu đang filter theo 1 dự án cụ thể
      console.log("[AI DEBUG] Đang filter theo projectId:", query.projectId);
      if (Array.isArray(dbTasks)) {
        const projectNames = dbTasks.map(t => t.projectId && t.projectId.name).filter(Boolean);
        console.log("[AI DEBUG] Danh sách projectName thực tế:", projectNames);
      }
    }

    // Xóa đoạn return sớm nếu không có task, để AI có cơ hội trả lời câu hỏi thông thường
    const taskListToMap = dbTasks || [];

    // 5. Format lại Data cho ngắn gọn trước khi gửi cho AI (Tránh tốn token)
    const formattedData = taskListToMap.map((task) => ({
      taskName: task.name,
      projectName: task.projectId?.name || "N/A",
      assignee: task.assigneeId?.fullName || task.assigneeId?.email || "Chưa giao cho ai",
      priority: task.priorityId?.name || task.priorityId?.level || "N/A",
      taskType: task.taskTypeId?.name || "N/A",
      platform: task.platformId?.name || "N/A",
      status: task.statusId?.name || task.statusId?.category || "N/A",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : null,
      isOverdue: task.dueDate && new Date(task.dueDate) < new Date(),
      progress: task.progress || 0,
      taskKey: task.key,
      taskLink: task.key ? `/app/task/${task.key}` : null,
    }));

    // Danh sách dự án user tham gia (dù có task hay không)
    const allUserProjects = userProjects.map((p) => ({
      projectName: p.name,
      status: p.status || "active", // Nếu có trường trạng thái, lấy ra, không thì mặc định active
      role: userRolesInProjects.find(r => r.projectName === p.name)?.role || "MEMBER"
    }));

    const projectDataPayload = {
      currentDate: new Date().toISOString().split("T")[0],
      warning: "Danh sách này chứa task của NHIỀU dự án khác nhau. AI cần tự lọc theo projectName. Danh sách projects luôn đầy đủ, kể cả dự án không có task.",
      totalTasksAcrossAllAllowedProjects: formattedData.length,
      tasks: formattedData,
      projects: allUserProjects
    };

    // Thêm câu hỏi của user vào history trước khi gửi đi
    historyForAI.push({ role: 'user', content: question });

    const analysisResult = await aiAssistantService.analyzeProjectRisk(projectDataPayload, question, userInfo, historyForAI);
    
    // Lưu tin nhắn user và assistant vào DB
    await AIChatMessage.create({ session: session._id, role: "user", content: question });
    await AIChatMessage.create({ session: session._id, role: "assistant", content: analysisResult });
    
    // Cập nhật thời gian cho session
    session.updatedAt = new Date();
    await session.save();
    
    res.status(200).json({ recommendation: analysisResult, sessionId: session._id });
  } catch (error) {
    console.error("Analysis Controller Error:", error);
    
    let errorMsg = "Lỗi hệ thống khi AI phân tích rủi ro.";
    const is402 = error && (error.status === 402 || error.code === 402 || (error.error && (error.error.code === 402 || (error.error.status === 402))) || (error.message && error.message.includes("402")));
    if (is402) {
      errorMsg = "API Key của dịch vụ AI đã hết Token hoặc quá giới hạn hạn mức (Credits). Vui lòng nạp thêm API để tiếp tục!";
    }

    const fallbackSessionId = typeof session !== "undefined" && session?._id 
      ? session._id 
      : req.body.sessionId;

    res.status(200).json({
      recommendation: errorMsg,
      sessionId: fallbackSessionId
    });
  }
};

const handleChatCommand = async (req, res) => {
  try {
    const { command, sessionId, historyForAI } = req.body;
    const userId = req.user.id;

    let session;
    if (sessionId) {
      session = await AIChatSession.findOne({ _id: sessionId, user: userId });
      if (!session) {
        return res.status(404).json({ message: "Phiên chat không tồn tại hoặc bạn không có quyền truy cập." });
      }
    } else {
      session = await AIChatSession.create({ user: userId, title: "Tạo task: " + command.substring(0, 30) });
    }

    const parsedCommand = await aiAssistantService.parseTaskCommand(command, historyForAI || []);

    if (!parsedCommand || parsedCommand.function !== "create_task") {
      const response = "Không hiểu lệnh hoặc chưa hỗ trợ lệnh này.";
      await AIChatMessage.create({ session: session._id, role: "user", content: command });
      await AIChatMessage.create({ session: session._id, role: "assistant", content: response });
      session.updatedAt = new Date();
      await session.save();
      return res.status(200).json({ recommendation: response, sessionId: session._id });
    }

    const { taskName, assigneeName, sprintName, platformName, priorityLevel, projectName, taskTypeName, statusName, startDate, dueDate } =
      parsedCommand.params;

    if (!taskName) {
      const response = "Bạn muốn tạo công việc mới nhưng chưa cung cấp tên công việc (ví dụ: 'tạo task sửa lỗi đăng nhập'). Hãy cung cấp tên task nhé!";
      await AIChatMessage.create({ session: session._id, role: "user", content: command });
      await AIChatMessage.create({ session: session._id, role: "assistant", content: response });
      session.updatedAt = new Date();
      await session.save();
      return res.status(200).json({ recommendation: response, sessionId: session._id });
    }

    const taskData = {
      name: taskName,
      reporterId: userId,
      createdById: userId,
    };

    if (startDate) taskData.startDate = new Date(startDate);
    if (dueDate) taskData.dueDate = new Date(dueDate);

    let targetProject = null;
    if (projectName) {
      targetProject = await Project.findOne({ name: new RegExp(projectName, "i") });
      if (targetProject) taskData.projectId = targetProject._id;
    }

    if (!taskData.projectId || !targetProject) {
      const response = "Không tìm thấy dự án hoặc bạn chưa cung cấp tên dự án. Vui lòng cho biết thêm tên dự án để tạo task nhé! (Ví dụ: tạo task XYZ cho dự án ABC)";
      await AIChatMessage.create({ session: session._id, role: "user", content: command });
      await AIChatMessage.create({ session: session._id, role: "assistant", content: response });
      session.updatedAt = new Date();
      await session.save();
      return res.status(200).json({ recommendation: response, sessionId: session._id });
    }

    const currentUserObj = await User.findById(userId);
    const isSystemAdmin = currentUserObj?.role === "admin";
    
    const isCurrentUserMember =
      targetProject.members?.some((m) => m.userId.toString() === userId.toString()) ||
      targetProject.teams?.some(
        (t) => t.leaderId?.toString() === userId.toString() || t.members?.some((mId) => mId.toString() === userId.toString()),
      );
      
    if (!isCurrentUserMember && !isSystemAdmin) {
      const response = `Bạn không phải là thành viên của dự án **${targetProject.name}** nên hệ thống từ chối tạo task tại đây.`;
      await AIChatMessage.create({ session: session._id, role: "user", content: command });
      await AIChatMessage.create({ session: session._id, role: "assistant", content: response });
      session.updatedAt = new Date();
      await session.save();
      return res.status(200).json({ recommendation: response, sessionId: session._id });
    }

    let assigneeWarning = "";
    if (assigneeName) {
      const safeAssigneeName = assigneeName.trim().replace(/^@/, ""); // Khử khoảng trắng trước rồi mới xoá @
      const user = await User.findOne({
        $or: [{ email: new RegExp(`^${safeAssigneeName}$`, "i") }, { fullname: new RegExp(safeAssigneeName, "i") }],
      });
      if (user) {
        // Kiểm tra user được giao có nằm trong dự án không hoặc user được giao là admin
        const isAssigneeInProject =
          user.role === "admin" ||
          targetProject.members?.some((m) => m.userId.toString() === user._id.toString()) ||
          targetProject.teams?.some(
            (t) => t.leaderId?.toString() === user._id.toString() || t.members?.some((mId) => mId.toString() === user._id.toString()),
          );
        if (isAssigneeInProject || isSystemAdmin) {
          taskData.assigneeId = user._id;
        } else {
          assigneeWarning = ` (⚠️ User ${user.fullname} không thuộc dự án này nên hệ thống đã bỏ trống người được giao)`;
        }
      } else {
        assigneeWarning = ` (⚠️ Không tìm thấy thành viên: ${assigneeName})`;
      }
    }

    let sprintSet = false;
    if (sprintName) {
      const sprint = await Sprint.findOne({ name: new RegExp("^" + sprintName.trim() + "$", "i"), projectId: taskData.projectId });
      if (sprint) {
        taskData.sprintId = sprint._id;
        sprintSet = true;
      }
    }

    if (!sprintSet) {
      let backlogSprint = await Sprint.findOne({ name: new RegExp("^Backlog$", "i"), projectId: taskData.projectId });
      if (!backlogSprint) backlogSprint = await Sprint.findOne({ name: new RegExp("^Backlog$", "i"), projectId: null });
      if (backlogSprint) {
        taskData.sprintId = backlogSprint._id;
      }
    }

    if (platformName) {
      let platform = await Platform.findOne({ name: new RegExp("^" + platformName.trim() + "$", "i"), projectId: taskData.projectId });
      if (!platform) platform = await Platform.findOne({ name: new RegExp("^" + platformName.trim() + "$", "i"), projectId: null });
      if (platform) taskData.platformId = platform._id;
    }

    let priorityLevelSet = false;
    if (priorityLevel) {
      const safePriorityLevel = priorityLevel.trim();
      let priority = await Priority.findOne({ name: new RegExp("^" + safePriorityLevel + "$", "i"), projectId: taskData.projectId });
      if (!priority) priority = await Priority.findOne({ name: new RegExp("^" + safePriorityLevel + "$", "i"), projectId: null });
      if (priority) {
        taskData.priorityId = priority._id;
        priorityLevelSet = true;
      }
    }
    if (!priorityLevelSet) {
      let defaultPriority = await Priority.findOne({ level: "2", projectId: taskData.projectId });
      if (!defaultPriority) defaultPriority = await Priority.findOne({ level: "2", projectId: null });
      if (defaultPriority) taskData.priorityId = defaultPriority._id;
    }

    let taskTypeSet = false;
    if (taskTypeName) {
      const safeTaskTypeName = taskTypeName.trim();
      let taskType = await TaskType.findOne({ name: new RegExp("^" + safeTaskTypeName + "$", "i"), projectId: taskData.projectId });
      if (!taskType) taskType = await TaskType.findOne({ name: new RegExp("^" + safeTaskTypeName + "$", "i"), projectId: null });
      if (taskType) {
        taskData.taskTypeId = taskType._id;
        taskTypeSet = true;
      }
    }
    if (!taskTypeSet) {
      let defaultTaskType = await TaskType.findOne({ name: "Task", projectId: taskData.projectId });
      if (!defaultTaskType) defaultTaskType = await TaskType.findOne({ name: "Task", projectId: null });
      if (defaultTaskType) taskData.taskTypeId = defaultTaskType._id;
    }

    if (!taskData.statusId) {
      const defaultWorkflow = await Workflow.findOne({ projectId: taskData.projectId });
      if (defaultWorkflow) {
        const defaultStatus = defaultWorkflow.statuses.find((s) => s.category === "To Do");
        if (defaultStatus) {
          taskData.statusId = defaultStatus._id;
        }
      }
    }

    if (!taskData.statusId) {
      const response = "Không tìm thấy trạng thái mặc định (To Do) cho project này nên không thể tự động tạo.";
      await AIChatMessage.create({ session: session._id, role: "user", content: command });
      await AIChatMessage.create({ session: session._id, role: "assistant", content: response });
      session.updatedAt = new Date();
      await session.save();
      return res.status(200).json({ recommendation: response, sessionId: session._id });
    }

    // 4. Tạo Task & gửi lệnh lưu vào DB
    const newTask = await taskService.createTask(taskData, userId);
    const taskUrl = `/app/task/${newTask.key}`;
    
    const aiResponse = `🎉 Thành công! Công việc của bạn đã được tạo.\n- **Task mới:** [${newTask.key}] - ${newTask.name}\n- **Thành viên:** ${taskData.assigneeId ? assigneeName : "Chưa gán"}${assigneeWarning}\n\n👉 [Click vào đây để xem chi tiết Task](${taskUrl})`;

    // Lưu tin nhắn user và AI vào CSDL
    await AIChatMessage.create({
      session: session._id,
      role: "user",
      content: command
    });
    await AIChatMessage.create({
      session: session._id,
      role: "assistant",
      content: aiResponse
    });
    
    // Cập nhật thời gian và có thể cả title cho session
    session.title = "Tạo task: " + newTask.name;
    session.updatedAt = new Date();
    await session.save();
    
    res.status(200).json({
      recommendation: aiResponse,
      sessionId: session._id,
      taskKey: newTask.key
    });
  } catch (error) {
    console.error("Chat Command Controller Error:", error);
    let errorMsg = `Lỗi hệ thống khi tạo task: ${error.message}`;
    if (error.message && error.message.includes("402")) {
       errorMsg = "Lỗi khi tạo task: API Key AI của bạn đã hết hạn mức Token.";
    }
    
    const fallbackSessionId = typeof session !== "undefined" && session?._id 
      ? session._id 
      : req.body.sessionId;
      
    res.status(200).json({ recommendation: errorMsg, sessionId: fallbackSessionId });
  }
};

module.exports = {
  getSessions,
  createSession,
  getSessionMessages,
  deleteSession,
  handleAnalyzeRisk,
  handleChatCommand,
};
