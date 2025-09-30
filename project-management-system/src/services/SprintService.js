const Sprint = require("../models/Sprint");
const Task = require("../models/Task.js");
const Project = require("../models/Project.js");
const Workflow = require("../models/Workflow.js");
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
          const wf = await Workflow.findOne({ "statuses._id": t.statusId });
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

  createSprint: async (projectKey) => {
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
        status: "not started",
        startDate: new Date(),
        endDate: new Date(),
        projectId: project._id,
      };
      const newSprint = new Sprint(sprintData);
      return await newSprint.save();
    } catch (error) {
      if (error.statusCode) throw error;
      throw { statusCode: 500, message: "Server Error" + error.message };
    }
  },
  updateSprint: async (sprintId, sprintData) => {
    try {
      const sprint = await Sprint.findById(sprintId);
      if (!sprint) throw { statusCode: 404, message: "Sprint not found" };
    } catch (error) {
      if (error.statusCode) throw error;
      throw { statusCode: 500, message: "Server Error" };
    }
    return await Sprint.findByIdAndUpdate(sprintId, sprintData, { new: true });
  },
  deleteSprint: async (sprintId) => {
    try {
      const sprint = await Sprint.findById(sprintId);
      if (!sprint) throw { statusCode: 404, message: "Sprint not found" };
      const tasks = await Task.find({ sprintId });
      if (tasks.length > 0) throw { statusCode: 400, message: "Cannot delete sprint with associated tasks" };
    } catch (error) {
      if (error.statusCode) throw error;
      throw { statusCode: 500, message: "Server Error" };
    }
    return await Sprint.findByIdAndDelete(sprintId);
  },
};

module.exports = sprintService;
