const Sprint = require("../models/Sprint");
const Task = require("../models/Task.js");
const Project = require("../models/Project.js");
const Workflow = require("../models/Workflow.js");
const { logAction } = require("./AuditLogHelper");
const sprintService = {
  getSprintsByProjectKey: async (projectKey) => {
    try {
      // Tìm project
      const project = await Project.findOne({ key: projectKey, status: "active" });
      if (!project) throw { statusCode: 404, message: "Project not found or inactive" };

      // Lấy sprint
      const sprints = await Sprint.find({ projectId: project._id }).sort({ createdAt: 1 }).lean();

      // Lấy tất cả task trong project
      const tasks = await Task.find({ projectId: project._id }).populate("assigneeId").populate("priorityId").lean();

      // Hàm xử lý status cho task
      const enrichTaskStatus = async (t) => {
        if (t.statusId) {
          const wf = await Workflow.findOne({ projectId: project._id });
          if (wf) {
            const status = wf.statuses.find((s) => s._id.toString() === t.statusId.toString());
            t.statusId = status || null;
          } else {
            t.statusId = null;
          }
        } else {
          t.statusId = null;
        }
        return t;
      };

      // Map status cho tất cả tasks (song song cho nhanh)
      const enrichedTasks = await Promise.all(tasks.map(enrichTaskStatus));

      // Gán task vào sprint
      const sprintWithTasks = sprints.map((s) => ({
        ...s,
        tasks: enrichedTasks.filter((t) => t.sprintId && t.sprintId.toString() === s._id.toString()),
      }));

      // Task chưa thuộc sprint
      const tasksWithoutSprint = enrichedTasks.filter((t) => !t.sprintId);

      return { sprint: sprintWithTasks, tasksWithoutSprint };
    } catch (error) {
      throw error;
    }
  },

  createSprint: async (projectKey, userId) => {
    try {
      const project = await Project.findOne({ key: projectKey, status: "active" });
      if (!project) throw { statusCode: 404, message: "Project not found or inactive" };
      let index = 1;
      let sprintName;
      let exists = true;
      do {
        sprintName = `${project.key} Sprint ${index}`;
        exists = await Sprint.exists({ projectId: project._id, name: sprintName });
        index++;
      } while (exists);
      const sprintData = {
        name: sprintName,
        startDate: new Date(),
        endDate: new Date(),
        projectId: project._id,
      };
      const newSprint = new Sprint(sprintData);
      const savedSprint = await newSprint.save();
      await logAction({
        userId,
        action: "create_sprint",
        tableName: "Sprint",
        recordId: savedSprint._id,
        newData: savedSprint,
      });
      return savedSprint;
    } catch (error) {
      if (error.statusCode) throw error;
      throw { statusCode: 500, message: "Server Error" + error.message };
    }
  },
  updateSprint: async (sprintId, sprintData, userId) => {
    try {
      const sprint = await Sprint.findById(sprintId);
      if (!sprint) throw { statusCode: 404, message: "Sprint not found" };
      if (sprintData.status) {
        const validStatuses = ["Not Start", "Started", "Completed"];
        if (!validStatuses.includes(sprintData.status)) {
          throw { statusCode: 400, message: "Invalid sprint status" };
        }
      }
    } catch (error) {
      if (error.statusCode) throw error;
      throw { statusCode: 500, message: "Server Error" };
    }

    const oldSprint = await Sprint.findById(sprintId).lean();
    const updatedSprint = await Sprint.findByIdAndUpdate(sprintId, sprintData, { new: true });
    await logAction({
      userId,
      action: "update_sprint",
      tableName: "Sprint",
      recordId: updatedSprint._id,
      oldData: oldSprint,
      newData: updatedSprint,
    });
    return updatedSprint;
  },
  deleteSprint: async (sprintId, userId) => {
    try {
      const sprint = await Sprint.findById(sprintId);
      if (!sprint) throw { statusCode: 404, message: "Sprint not found" };
      const tasks = await Task.find({ sprintId });
      if (tasks.length > 0) throw { statusCode: 400, message: "Cannot delete sprint with associated tasks" };
    } catch (error) {
      if (error.statusCode) throw error;
      throw { statusCode: 500, message: "Server Error" };
    }
    const deletedSprint = await Sprint.findByIdAndDelete(sprintId);
    await logAction({
      userId,
      action: "delete_sprint",
      tableName: "Sprint",
      recordId: deletedSprint._id,
      oldData: deletedSprint,
    });
    return { message: "Sprint deleted successfully" };
  },

  // Get started sprints by project key
  getStartedSprintsByProjectKey: async (projectKey) => {
    try {
      const project = await Project.findOne({ key: projectKey, status: "active" });
      if (!project) throw { statusCode: 404, message: "Project not found or inactive" };

      const startedSprints = await Sprint.find({
        projectId: project._id,
        status: "Started",
      })
        .sort({ createdAt: -1 })
        .lean();

      return startedSprints;
    } catch (error) {
      if (error.statusCode) throw error;
      throw { statusCode: 500, message: "Server Error: " + error.message };
    }
  },

  // Get tasks by sprint with status details
  getTasksBySprintWithStatus: async (sprintId) => {
    try {
      const sprint = await Sprint.findById(sprintId);
      if (!sprint) throw { statusCode: 404, message: "Sprint not found" };

      const tasks = await Task.find({ sprintId })
        .populate("taskTypeId", "name icon")
        .populate("priorityId", "name icon")
        .populate("assigneeId", "fullname avatar")
        .populate("reporterId", "fullname avatar")
        .populate("platformId", "name icon")
        .lean();

      // Enrichment status for tasks
      const enrichedTasks = await Promise.all(
        tasks.map(async (task) => {
          if (task.statusId) {
            const workflow = await Workflow.findOne({ projectId: sprint.projectId });
            if (workflow) {
              const status = workflow.statuses.find((s) => s._id.toString() === task.statusId.toString());
              task.statusId = status || null;
            }
          }
          return task;
        })
      );

      return { sprint, tasks: enrichedTasks };
    } catch (error) {
      if (error.statusCode) throw error;
      throw { statusCode: 500, message: "Server Error: " + error.message };
    }
  },
};

module.exports = sprintService;
