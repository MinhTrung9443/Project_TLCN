const taskService = require("../services/TaskService");
const Workflow = require("../models/Workflow");
const workflowService = require("../services/WorkflowService");
const projectService = require("../services/ProjectService");
const Task = require("../models/Task");

const handleGetTasksByProjectKey = async (req, res) => {
  try {
    const { projectKey } = req.params;
    const tasks = await taskService.getTasksByProjectKey(projectKey);
    res.status(200).json(tasks);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleCreateTask = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.id;
    const taskData = { ...req.body, reporterId: userId, createdById: userId };

    if (!taskData.statusId) {
      const defaultWorkflow = await Workflow.findOne({ projectId: taskData.projectId });
      if (!defaultWorkflow) {
        return res.status(400).json({ message: "No default workflow found" });
      }
      const defaultStatus = defaultWorkflow.statuses.find((s) => s.category === "To Do");
      if (!defaultStatus) {
        return res.status(400).json({ message: "No default 'To Do' status found in workflow" });
      }
      taskData.statusId = defaultStatus._id;
    }
    const newTask = await taskService.createTask(taskData, userId);
    res.status(201).json(newTask);
  } catch (error) {
    console.error("Error in handleCreateTask:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const changeSprint = async (req, res) => {
  try {
    const { projectKey, taskId } = req.params;
    const { sprintId } = req.body;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const updatedTask = await taskService.changeTaskSprint(taskId, sprintId, req.user.id);
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleUpdateTaskStatus = async (req, res) => {
  try {
    // Lấy cả hai tham số từ URL
    const { projectKey, taskId } = req.params; 
    const { statusId } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Gọi service, có thể không cần truyền projectKey nếu service không dùng
    const updatedTask = await taskService.updateTaskStatus(taskId, statusId, req.user.id);
    
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleSearchTasks = async (req, res) => {
  try {
    const tasks = await taskService.searchTasks(req.query);
    res.status(200).json(tasks);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleUpdateTask = async (req, res) => {
  try {
    const { projectKey, taskId } = req.params; 
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: User not found." });
    }
    const userId = req.user.id;
    const updatedTask = await taskService.updateTask(taskId, req.body, userId);
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error in handleUpdateTask:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleDeleteTask = async (req, res) => {
  try {
    const { projectKey, taskId } = req.params;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.id;
    await taskService.deleteTask(taskId, userId);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleGetTaskHistory = async (req, res) => {
  try {
    const { taskId } = req.params;

    const history = await taskService.getTaskHistory(taskId);

    res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching task history:", error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const handleAddAttachment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.id;
        
        const updatedTask = await taskService.addAttachment(taskId, req.file, userId);
        
        res.status(200).json(updatedTask);
    } catch (error) {
        console.error("Error adding attachment:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
};

const handleDeleteAttachment = async (req, res) => {
    try {
        const { taskId, attachmentId } = req.params;
        const userId = req.user.id;
        
        const updatedTask = await taskService.deleteAttachment(taskId, attachmentId, userId);
        
        res.status(200).json(updatedTask);
    } catch (error) {
        console.error("Error deleting attachment:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
};

const handleLinkTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { targetTaskId, linkType } = req.body;
    const userId = req.user.id;

    if (!targetTaskId || !linkType) {
      return res.status(400).json({ message: "targetTaskId and linkType are required." });
    }

    const updatedTask = await taskService.linkTask(taskId, targetTaskId, linkType, userId);
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleUnlinkTask = async (req, res) => {
  try {
    const { taskId, linkId } = req.params;
    const userId = req.user.id;

    const updatedTask = await taskService.unlinkTask(taskId, linkId, userId);
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const getAvailableTaskStatuses = async (req, res) => {
  try {
    const { taskId } = req.params;

    // 1. Lấy Task và populate projectId
    const task = await Task.findById(taskId).populate("projectId");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // --- KIỂM TRA AN TOÀN (SAFE CHECK) ---
    
    // Kiểm tra 1: Task có thuộc Project nào không?
    if (!task.projectId || !task.projectId.key) {
      console.error(`[Error] Task ${taskId} does not belong to a valid Project.`);
      // Nếu lỗi dữ liệu, trả về mảng rỗng hoặc lỗi 400 thay vì crash 500
      return res.status(400).json({ message: "Project not found for this task" });
    }
    const projectKey = task.projectId.key;

    // Kiểm tra 2: Xử lý statusId (Khó nhất vì Mongoose có thể trả về String hoặc Object)
    let currentStatusId = null;
    if (task.statusId) {
        // Nếu là Object (đã populated) -> lấy ._id
        if (typeof task.statusId === 'object' && task.statusId._id) {
            currentStatusId = task.statusId._id.toString();
        } 
        // Nếu là String/ObjectId -> convert thẳng
        else {
            currentStatusId = task.statusId.toString();
        }
    }

    if (!currentStatusId) {
         console.error(`[Error] Task ${taskId} has invalid Status ID.`);
         return res.status(400).json({ message: "Current status invalid" });
    }

    // 2. Gọi Service
    const availableStatuses = await workflowService.getNextStatuses(
        projectKey, 
        currentStatusId
    );

    return res.status(200).json(availableStatuses);

  } catch (error) {
    // In lỗi chi tiết ra Terminal để bạn debug
    console.error("CRITICAL SERVER ERROR in getAvailableTaskStatuses:", error); 
    return res.status(500).json({ message: "Internal Server Error: " + error.message });
  }
};
const handleGetTaskByKey = async (req, res, next) => {
  try {
    const { taskKey } = req.params;
    const task = await taskService.getTaskByKey(taskKey);
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};
module.exports = {
  handleGetTasksByProjectKey,
  handleCreateTask,
  changeSprint,
  handleUpdateTaskStatus,
  handleSearchTasks,
  handleUpdateTask,
  handleDeleteTask,
  handleGetTaskHistory,
  handleAddAttachment, 
  handleDeleteAttachment,
  handleLinkTask,    
  handleUnlinkTask, 
  getAvailableTaskStatuses,
  handleGetTaskByKey,
};