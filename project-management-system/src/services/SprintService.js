const Sprint = require("../models/Sprint");
const Task = require("../models/Task.js");
const Project = require("../models/Project.js");
const sprintService = {
  getSprintsByProjectKey: async (projectKey) => {
    try {
      const project = await Project.findOne({ projectKey, status: "active" });
      if (!project) throw { statusCode: 404, message: "Project not found or inactive" };
      const sprint = await Sprint.find({ projectId: project._id }).sort({ createdAt: -1 });
      const tasks = await Task.find({ sprintId: { $in: sprint.map((s) => s._id) } })
      .populate('assignee', 'username email');
      sprint.forEach((s) => {
        s.tasks = tasks.filter((t) => t.sprintId.toString() === s._id.toString());
      });
      const tasksWithoutSprint = await Task.find({ projectId: project._id, sprintId: null });

      return { sprint, tasksWithoutSprint };
    } catch (error) {
      throw error;
    }
  },
  createSprint: async (sprintData, projectKey) => {
    try {
      const project = await Project.findOne({ projectKey, status: "active" });
      if (!project) throw { statusCode: 404, message: "Project not found or inactive" };
      const newSprint = new Sprint({ ...sprintData, projectId: project._id });
      return await newSprint.save();
    } catch (error) {
      if (error.statusCode) throw error;
      throw { statusCode: 500, message: "Server Error" };
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
