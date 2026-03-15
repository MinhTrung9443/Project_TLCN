const aiAssistantService = require("../services/AIAssistantService");
const User = require("../models/User");
const Project = require("../models/Project");
const Sprint = require("../models/Sprint");
const Platform = require("../models/Platform");
const Priority = require("../models/Priority");
const TaskType = require("../models/TaskType");
const Workflow = require("../models/Workflow");
const taskService = require("../services/TaskService");

const handleAnalyzeRisk = async (req, res) => {
    try {
        const { targetProjectName, question } = req.body;
        const userId = req.user.id;

        // 1. Kiểm tra Quyền truy cập (RBAC) của User
        const user = await User.findById(userId);
        const isSystemAdmin = user?.role === "admin";

        // Lấy danh sách dự án user đang tham gia và gán vai trò
        const userProjects = await Project.find({
            $or: [
                { 'members.userId': userId },
                { 'teams.leaderId': userId }
            ]
        }).lean();

        const allowedProjectIds = userProjects.map(p => p._id);
        const userRolesInProjects = userProjects.map(p => {
            let role = "MEMBER";
            const memberObj = p.members?.find(m => m.userId?.toString() === userId.toString());
            if (memberObj) {
                role = memberObj.role; 
            } else {
                const isTeamLeader = p.teams?.some(t => t.leaderId?.toString() === userId.toString());
                if (isTeamLeader) role = "LEADER";
            }
            return { projectName: p.name, role: role };
        });

        // 2. Trích xuất thông tin User để AI nắm ngữ cảnh quyền hạn
        const userInfo = {
            fullName: req.user.fullName || req.user.username || user?.fullname,
            email: req.user.email || user?.email,
            isSystemAdmin: isSystemAdmin,
            projectRoles: userRolesInProjects
        };

        // 3. Build Query lấy Task
        let query = {};
        if (targetProjectName) {
            const project = await Project.findOne({ name: new RegExp(targetProjectName, 'i') });
            if (!project) {
                return res.status(404).json({ message: "Không tìm thấy dự án này trong Database." });
            }
            
            // Nếu không phải admin thì phải được cấp quyền trong dự án (nằm trong allowedProjectIds)
            if (!isSystemAdmin) {
                const hasAccess = allowedProjectIds.some(id => id.toString() === project._id.toString());
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
        const dbTasks = await require("../models/Task").find(query)
            .populate("assigneeId", "fullName email")
            .populate("projectId", "name")
            .populate("statusId", "name category") // Thường workflow status lưu string hoặc object
            .populate("priorityId", "name level")
            .populate("taskTypeId", "name")
            .populate("platformId", "name")
            .lean();

        if (!dbTasks || dbTasks.length === 0) {
            return res.status(200).json({ recommendation: "Chưa có task nào trong hệ thống hoặc trong dự án bạn chọn." });
        }

        // 5. Format lại Data cho ngắn gọn trước khi gửi cho AI (Tránh tốn token)
        const formattedData = dbTasks.map(task => ({
            taskName: task.name,
            projectName: task.projectId?.name || "N/A",
            assignee: task.assigneeId?.fullName || task.assigneeId?.email || "Chưa giao cho ai",
            priority: task.priorityId?.name || task.priorityId?.level || "N/A",
            taskType: task.taskTypeId?.name || "N/A",
            platform: task.platformId?.name || "N/A",
            status: task.statusId?.name || task.statusId?.category || "N/A",
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null,
            isOverdue: task.dueDate && new Date(task.dueDate) < new Date(),
            progress: task.progress || 0
        }));

        const projectDataPayload = {
            currentDate: new Date().toISOString().split('T')[0], // Gửi ngày tháng hiện tại
            totalTasks: formattedData.length,
            tasks: formattedData
        };

        const analysisResult = await aiAssistantService.analyzeProjectRisk(projectDataPayload, question, userInfo);
        res.status(200).json({ recommendation: analysisResult });
    } catch (error) {
        console.error("Analysis Controller Error:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi AI phân tích rủi ro." });
    }
};

const handleChatCommand = async (req, res) => {
    try {
        const { command } = req.body;

        // 1. Lấy user hiện tại từ token xác thực
        const userId = req.user.id;

        const parsedCommand = await aiAssistantService.parseTaskCommand(command);
        
        if (!parsedCommand || parsedCommand.function !== "create_task") {
            return res.status(400).json({ message: "Không hiểu lệnh hoặc chưa hỗ trợ lệnh này." });
        }

        // 2. Lấy Text Name từ AI
        const { taskName, assigneeName, sprintName, platformName, priorityLevel, projectName, taskTypeName } = parsedCommand.params;
        
        // 3. Mapping Object IDs dùng Schema Task.js
        const taskData = {
            name: taskName,
            reporterId: userId,
            createdById: userId,
        };

        if (projectName) {
            const project = await Project.findOne({ name: new RegExp(projectName, 'i') });
            if (project) taskData.projectId = project._id;
        }

        if (!taskData.projectId) {
            return res.status(400).json({ message: "Không tìm thấy dự án hoặc bạn chưa cung cấp tên dự án." });
        }

        if (assigneeName) {
             const user = await User.findOne({
                 $or: [{ email: new RegExp(assigneeName, 'i') }, { fullName: new RegExp(assigneeName, 'i') }]
             });
             if (user) taskData.assigneeId = user._id;
        }

        if (sprintName) {
            // Sprint phải thuộc về Project này
            const sprint = await Sprint.findOne({ name: new RegExp(sprintName, 'i'), projectId: taskData.projectId });
            if (sprint) taskData.sprintId = sprint._id;
        }

        if (platformName) {
            const platform = await Platform.findOne({ name: new RegExp(platformName, 'i') });
            if (platform) taskData.platformId = platform._id;
        }

        // Priority là Bắt Buộc (required: true) trong Model
        if (priorityLevel) {
            const priority = await Priority.findOne({ name: new RegExp(priorityLevel, 'i') });
            if (priority) taskData.priorityId = priority._id;
        } else {
            const defaultPriority = await Priority.findOne();
            if (defaultPriority) taskData.priorityId = defaultPriority._id;
        }

        // TaskType là Bắt Buộc (required: true)
        if (taskTypeName) {
            const taskType = await TaskType.findOne({ name: new RegExp(taskTypeName, 'i') });
            if (taskType) taskData.taskTypeId = taskType._id;
        } else {
            const defaultTaskType = await TaskType.findOne();
            if (defaultTaskType) taskData.taskTypeId = defaultTaskType._id;
        }

        // Lấy statusId Mặc định ('To Do') bằng Workflow của dự án
        const defaultWorkflow = await Workflow.findOne({ projectId: taskData.projectId });
        if (defaultWorkflow) {
            const defaultStatus = defaultWorkflow.statuses.find((s) => s.category === "To Do");
            if (defaultStatus) {
                taskData.statusId = defaultStatus._id;
            }
        }

        if (!taskData.statusId) {
            return res.status(400).json({ message: "Không tìm thấy trạng thái mặc định (To Do) cho project này." });
        }

        // 4. Tạo Task & gửi lệnh lưu vào DB
        const newTask = await taskService.createTask(taskData, userId);

        res.status(200).json({
            message: "Xong rồi! Model đã tự động tạo task hoàn chỉnh vào Database.",
            task: newTask
        });

    } catch (error) {
        console.error("Chat Command Controller Error:", error);
        res.status(500).json({ message: "Lỗi hệ thống tạo task từ AI.", details: error.message });
    }
};

module.exports = {
    handleAnalyzeRisk,
    handleChatCommand
};
