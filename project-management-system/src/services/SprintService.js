const Sprint = require("../models/Sprint");
const Task = require("../models/Task.js");
const Project = require("../models/Project.js");
const Workflow = require("../models/Workflow.js");
const sprintService = {
  getSprintsByProjectKey: async (projectKey) => {
    try {
      const project = await Project.findOne({ key: projectKey, status: "active" });
      if (!project) throw { statusCode: 404, message: "Project not found or inactive" };
      const sprint = await Sprint.find({ projectId: project._id }).sort({ createdAt: 1 });
      // Populate all related fields for tasks in sprints
      const tasks = await Task.find({ sprintId: { $in: sprint.map((s) => s._id) } })
        .populate("assigneeId")
        .populate("priorityId");

      // Gán status cho từng task
      for (const t of tasks) {
        if (t.statusId) {
          // Tìm status trong tất cả workflow
          const wf = await Workflow.findOne({ "statuses._id": t.statusId });
          if (wf) {
            const status = wf.statuses.find((s) => s._id.toString() === t.statusId.toString());
            t._doc.statusId = status || null;
          } else {
            t._doc.statusId = null;
          }
        } else {
          t._doc.statusId = null;
        }
      }

      sprint.forEach((s) => {
        s.tasks = tasks.filter((t) => t.sprintId && t.sprintId._id.toString() === s._id.toString());
      });
      // Populate all related fields for tasks without sprint
      const tasksWithoutSprint = await Task.find({ projectId: project._id, sprintId: null }).populate("assigneeId").populate("priorityId");

      for (const t of tasksWithoutSprint) {
        if (t.statusId) {
          const wf = await Workflow.findOne({ "statuses._id": t.statusId });
          if (wf) {
            const status = wf.statuses.find((s) => s._id.toString() === t.statusId.toString());
            t._doc.statusId = status || null;
          } else {
            t._doc.statusId = null;
          }
        } else {
          t._doc.statusId = null;
        }
      }

      return { sprint, tasksWithoutSprint };
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
