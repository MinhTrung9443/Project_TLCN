const Project = require("../models/Project");
const Task = require("../models/Task");
const Sprint = require("../models/Sprint");
const Group = require("../models/Group");
const User = require("../models/User");
const mongoose = require("mongoose");

class GanttService {
  async getGanttData(filter, groupby, actor) {
    try {
      let assigneeIds = [];
      let projectIds = [];

      // 1.1 Filter by groups - get members from groups
      if (filter.groupIds && filter.groupIds.length > 0) {
        const groups = await Group.find({ _id: { $in: filter.groupIds } }).populate("members", "_id");

        const groupMemberIds = groups.flatMap((group) => group.members.map((member) => member._id.toString()));
        assigneeIds.push(...groupMemberIds);
      }

      // 1.2 Filter by assignees
      if (filter.assigneeIds && filter.assigneeIds.length > 0) {
        assigneeIds.push(...filter.assigneeIds.map((id) => id.toString()));
      }

      // Remove duplicates
      if (assigneeIds.length > 0) {
        assigneeIds = [...new Set(assigneeIds)];
      }

      // 1.3 Filter by projects with role-based access
      if (filter.projectIds && filter.projectIds.length > 0) {
        projectIds = filter.projectIds;
      } else if (actor) {
        // Apply role-based filtering if no specific projects selected
        const isAdmin = actor.role === "admin";
        if (!isAdmin) {
          // Non-admin: only show projects they participate in
          const userProjects = await Project.find({
            isDeleted: false,
            $or: [{ "members.userId": actor._id }, { "teams.leaderId": actor._id }, { "teams.members": actor._id }],
          }).select("_id");
          projectIds = userProjects.map((p) => p._id);
        }
      }

      // 1.4 Get statusFilter from filter object (default: 'active' shows only IN_PROGRESS)
      const statusFilter = filter.statusFilter || "active";

      // Step 2: GROUP BY logic
      let result;

      if (!groupby || groupby.length === 0) {
        // No grouping - return empty or all data
        result = { type: "none", data: [] };
      } else if (groupby.includes("project") && !groupby.includes("sprint") && !groupby.includes("task")) {
        // Only PROJECT
        result = await this.getProjectsOnly(projectIds, assigneeIds, statusFilter);
      } else if (groupby.includes("project") && groupby.includes("sprint") && !groupby.includes("task")) {
        // PROJECT + SPRINT
        result = await this.getProjectsWithSprints(projectIds, assigneeIds, statusFilter);
      } else if (groupby.includes("project") && groupby.includes("sprint") && groupby.includes("task")) {
        // PROJECT + SPRINT + TASK
        result = await this.getProjectsWithSprintsAndTasks(projectIds, assigneeIds, statusFilter);
      } else if (groupby.includes("project") && !groupby.includes("sprint") && groupby.includes("task")) {
        // PROJECT + TASK (no sprint)
        result = await this.getProjectsWithTasks(projectIds, assigneeIds, statusFilter);
      } else if (!groupby.includes("project") && groupby.includes("sprint") && !groupby.includes("task")) {
        // Only SPRINT (no project)
        result = await this.getSprintsOnly(projectIds, assigneeIds, statusFilter);
      } else if (!groupby.includes("project") && groupby.includes("sprint") && groupby.includes("task")) {
        // SPRINT + TASK (no project)
        result = await this.getSprintsWithTasks(projectIds, assigneeIds, statusFilter);
      } else if (!groupby.includes("project") && !groupby.includes("sprint") && groupby.includes("task")) {
        // Only TASK (no project, no sprint)
        result = await this.getTasksOnly(projectIds, assigneeIds, statusFilter);
      } else {
        // Default
        result = { type: "default", data: [] };
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  // 1. GROUP BY: Project only
  async getProjectsOnly(projectIds, assigneeIds, statusFilter = "active") {
    let query = { isDeleted: false };

    if (projectIds.length > 0) {
      query._id = { $in: projectIds };
    }

    // Apply status filter
    if (statusFilter === "active") {
      query.status = "active";
    } else if (statusFilter === "completed") {
      query.status = "completed";
    } else if (statusFilter === "paused") {
      query.status = "paused";
    }
    // 'all' - no status filter

    const projects = await Project.find(query).sort({ createdAt: -1 });

    return {
      type: "project",
      data: projects.map((p) => ({
        id: p._id,
        name: p.name,
        key: p.key,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
      })),
    };
  }

  // 2. GROUP BY: Project + Sprint
  async getProjectsWithSprints(projectIds, assigneeIds, statusFilter = "active") {
    let projectQuery = { isDeleted: false };

    if (projectIds.length > 0) {
      projectQuery._id = { $in: projectIds };
    }

    // Apply status filter
    if (statusFilter === "active") {
      projectQuery.status = "active";
    } else if (statusFilter === "completed") {
      projectQuery.status = "completed";
    } else if (statusFilter === "paused") {
      projectQuery.status = "paused";
    }

    const projects = await Project.find(projectQuery).sort({ createdAt: -1 });

    const result = [];

    for (const project of projects) {
      // Get sprints of this project
      const sprints = await Sprint.find({ projectId: project._id }).sort({ startDate: 1 });

      result.push({
        id: project._id,
        name: project.name,
        key: project.key,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        sprints: sprints.map((s) => ({
          id: s._id,
          name: s.name,
          startDate: s.startDate,
          endDate: s.endDate,
          status: s.status,
        })),
      });
    }

    return {
      type: "project-sprint",
      data: result,
    };
  }

  // 3. GROUP BY: Project + Sprint + Task
  async getProjectsWithSprintsAndTasks(projectIds, assigneeIds, statusFilter = "active") {
    let projectQuery = { isDeleted: false };

    if (projectIds.length > 0) {
      projectQuery._id = { $in: projectIds };
    }

    // Apply status filter
    if (statusFilter === "active") {
      projectQuery.status = "active";
    } else if (statusFilter === "completed") {
      projectQuery.status = "completed";
    } else if (statusFilter === "paused") {
      projectQuery.status = "paused";
    }

    const projects = await Project.find(projectQuery).sort({ createdAt: -1 });

    const result = [];

    for (const project of projects) {
      // Get sprints of this project
      const sprints = await Sprint.find({ projectId: project._id }).sort({ startDate: 1 });

      // Build task query
      let taskQuery = { projectId: project._id };

      if (assigneeIds.length > 0) {
        taskQuery.assigneeId = { $in: assigneeIds };
      }

      const projectData = {
        id: project._id,
        name: project.name,
        key: project.key,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        sprints: [],
        backlogTasks: [],
      };

      // Get tasks for each sprint
      for (const sprint of sprints) {
        const sprintTaskQuery = { ...taskQuery, sprintId: sprint._id };

        const sprintTasks = await Task.find(sprintTaskQuery).sort({ createdAt: -1 });

        projectData.sprints.push({
          id: sprint._id,
          name: sprint.name,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          status: sprint.status,
          tasks: sprintTasks.map((t) => this.formatTask(t)),
        });
      }

      // Get backlog tasks (tasks without sprint)
      const backlogTaskQuery = { ...taskQuery, sprintId: null };

      const backlogTasks = await Task.find(backlogTaskQuery).sort({ createdAt: -1 });

      projectData.backlogTasks = backlogTasks.map((t) => this.formatTask(t));

      result.push(projectData);
    }

    return {
      type: "project-sprint-task",
      data: result,
    };
  }
  // 4. GROUP BY: Project + Task (no sprint)
  async getProjectsWithTasks(projectIds, assigneeIds, statusFilter = "active") {
    let projectQuery = { isDeleted: false };
    if (projectIds.length > 0) {
      projectQuery._id = { $in: projectIds };
    }

    // Apply status filter
    if (statusFilter === "active") {
      projectQuery.status = "active";
    } else if (statusFilter === "completed") {
      projectQuery.status = "completed";
    } else if (statusFilter === "paused") {
      projectQuery.status = "paused";
    }

    const projects = await Project.find(projectQuery).sort({ createdAt: -1 });
    const result = [];
    for (const project of projects) {
      // Build task query
      let taskQuery = { projectId: project._id };
      if (assigneeIds.length > 0) {
        taskQuery.assigneeId = { $in: assigneeIds };
      }
      const projectData = {
        id: project._id,
        name: project.name,
        key: project.key,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        tasks: [],
      };

      // Get all tasks of the project
      const tasks = await Task.find(taskQuery).sort({ createdAt: -1 });
      projectData.tasks = tasks.map((t) => this.formatTask(t));
      result.push(projectData);
    }
    return {
      type: "project-task",
      data: result,
    };
  }

  // 5. GROUP BY: Sprint only (no project)
  async getSprintsOnly(projectIds, assigneeIds, statusFilter = "active") {
    let sprintQuery = {};

    if (projectIds.length > 0) {
      sprintQuery.projectId = { $in: projectIds };
    }

    const sprints = await Sprint.find(sprintQuery).sort({ startDate: 1 });

    return {
      type: "sprint",
      data: sprints.map((s) => ({
        id: s._id,
        name: s.name,
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status,
        projectId: s.projectId,
      })),
    };
  }

  // 6. GROUP BY: Sprint + Task (no project)
  async getSprintsWithTasks(projectIds, assigneeIds, statusFilter = "active") {
    let sprintQuery = {};

    if (projectIds.length > 0) {
      sprintQuery.projectId = { $in: projectIds };
    }

    const sprints = await Sprint.find(sprintQuery).sort({ startDate: 1 });
    const result = [];

    // Get unique project IDs from sprints
    const sprintProjectIds = [...new Set(sprints.map((s) => s.projectId.toString()))];

    for (const sprint of sprints) {
      // Build task query for this sprint
      let taskQuery = { sprintId: sprint._id };

      if (assigneeIds.length > 0) {
        taskQuery.assigneeId = { $in: assigneeIds };
      }

      const tasks = await Task.find(taskQuery).sort({ createdAt: -1 });

      result.push({
        id: sprint._id,
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        status: sprint.status,
        projectId: sprint.projectId,
        tasks: tasks.map((t) => this.formatTask(t)),
      });
    }

    // Get backlog tasks (tasks without sprint) for all projects that have sprints
    const backlogTasks = [];
    for (const projectId of sprintProjectIds) {
      let backlogTaskQuery = {
        projectId: projectId,
        sprintId: null,
      };

      if (assigneeIds.length > 0) {
        backlogTaskQuery.assigneeId = { $in: assigneeIds };
      }

      const tasks = await Task.find(backlogTaskQuery).sort({ createdAt: -1 });
      backlogTasks.push(...tasks.map((t) => this.formatTask(t)));
    }

    return {
      type: "sprint-task",
      data: result,
      backlogTasks: backlogTasks,
    };
  }

  // 7. GROUP BY: Task only (no project, no sprint)
  async getTasksOnly(projectIds, assigneeIds, statusFilter = "active") {
    let taskQuery = {};

    if (projectIds.length > 0) {
      taskQuery.projectId = { $in: projectIds };
    }

    if (assigneeIds.length > 0) {
      taskQuery.assigneeId = { $in: assigneeIds };
    }

    const tasks = await Task.find(taskQuery).sort({ createdAt: -1 });

    return {
      type: "task",
      data: tasks.map((t) => this.formatTask(t)),
    };
  }

  // Helper: Format task object
  formatTask(task) {
    return {
      id: task._id,
      key: task.key,
      name: task.name,
      description: task.description,
      status: task.statusId,
      priority: task.priorityId,
      taskType: task.taskTypeId,
      assignee: task.assigneeId,
      reporter: task.reporterId,
      startDate: task.startDate,
      dueDate: task.dueDate,
      estimatedTime: task.estimatedTime,
      actualTime: task.actualTime,
      progress: task.progress,
    };
  }
}

module.exports = new GanttService();
