const Project = require("../models/Project");
const Task = require("../models/Task");
const TimeLog = require("../models/TimeLog");
const Sprint = require("../models/Sprint");
const Group = require("../models/Group");
const User = require("../models/User");
const Workflow = require("../models/Workflow");
const mongoose = require("mongoose");

class GanttService {
  buildProjectQuery(filter = {}, actor) {
    const query = { isDeleted: false };

    if (filter.projectIds && filter.projectIds.length > 0) {
      query._id = { $in: filter.projectIds };
    } else if (actor && actor.role !== "admin") {
      query.$or = [{ "members.userId": actor._id }, { "teams.leaderId": actor._id }, { "teams.members": actor._id }];
    }

    const statusFilter = filter.statusFilter || "active";
    if (statusFilter === "active") {
      query.status = "active";
    } else if (statusFilter === "completed") {
      query.status = "completed";
    } else if (statusFilter === "paused") {
      query.status = "paused";
    }

    if (filter.startDate) {
      query.startDate = { $gte: new Date(filter.startDate) };
    }
    if (filter.endDate) {
      query.endDate = query.endDate || {};
      query.endDate.$lte = new Date(filter.endDate);
    }

    return query;
  }

  getPagination(filter = {}) {
    const page = Math.max(parseInt(filter.page, 10) || 1, 1);
    const limit = Math.max(parseInt(filter.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  async getGanttData(filter, groupby, actor) {
    try {
      let assigneeIds = [];
      const pagination = this.getPagination(filter);

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

      const projectQuery = this.buildProjectQuery(filter, actor);
      const totalProjects = await Project.countDocuments(projectQuery);
      const projects = await Project.find(projectQuery).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit);

      const projectIds = projects.map((project) => project._id);
      const statusFilter = filter.statusFilter || "active";

      // Step 2: GROUP BY logic
      let result;

      if (!groupby || groupby.length === 0) {
        // No grouping - return empty or all data
        result = { type: "none", data: [] };
      } else if (groupby.includes("project") && !groupby.includes("sprint") && !groupby.includes("task")) {
        // Only PROJECT
        result = await this.getProjectsOnly(projects);
      } else if (groupby.includes("project") && groupby.includes("sprint") && !groupby.includes("task")) {
        // PROJECT + SPRINT
        result = await this.getProjectsWithSprints(projects);
      } else if (groupby.includes("project") && groupby.includes("sprint") && groupby.includes("task")) {
        // PROJECT + SPRINT + TASK
        result = await this.getProjectsWithSprintsAndTasks(projects, assigneeIds, filter);
      } else if (groupby.includes("project") && !groupby.includes("sprint") && groupby.includes("task")) {
        // PROJECT + TASK (no sprint)
        result = await this.getProjectsWithTasks(projects, assigneeIds, filter);
      } else if (!groupby.includes("project") && groupby.includes("sprint") && !groupby.includes("task")) {
        // Only SPRINT (no project)
        result = await this.getSprintsOnly(projectIds);
      } else if (!groupby.includes("project") && groupby.includes("sprint") && groupby.includes("task")) {
        // SPRINT + TASK (no project)
        result = await this.getSprintsWithTasks(projectIds, assigneeIds, filter);
      } else if (!groupby.includes("project") && !groupby.includes("sprint") && groupby.includes("task")) {
        // Only TASK (no project, no sprint)
        result = await this.getTasksOnly(projectIds, assigneeIds, filter);
      } else {
        // Default
        result = { type: "default", data: [] };
      }

      return {
        ...result,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalProjects,
          totalPages: Math.max(Math.ceil(totalProjects / pagination.limit), 1),
          hasMore: pagination.skip + projects.length < totalProjects,
          nextPage: pagination.skip + projects.length < totalProjects ? pagination.page + 1 : null,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getWorkflowMapByProjectIds(projectIds = []) {
    const validProjectIds = [...new Set((projectIds || []).filter(Boolean).map((id) => id.toString()))];
    if (validProjectIds.length === 0) {
      return new Map();
    }

    const projects = await Project.find({ _id: { $in: validProjectIds } })
      .select("_id workflowId")
      .lean();
    const workflowIds = [...new Set(projects.map((p) => p.workflowId?.toString()).filter(Boolean))];

    const [workflowsByProjectId, workflowsByWorkflowId] = await Promise.all([
      Workflow.find({ projectId: { $in: validProjectIds } })
        .select("_id projectId statuses")
        .lean(),
      workflowIds.length > 0
        ? Workflow.find({ _id: { $in: workflowIds } })
            .select("_id projectId statuses")
            .lean()
        : Promise.resolve([]),
    ]);

    const workflowMapById = new Map(workflowsByWorkflowId.map((wf) => [wf._id.toString(), wf]));
    const workflowMapByProjectId = new Map();

    for (const workflow of workflowsByProjectId) {
      if (workflow.projectId) {
        workflowMapByProjectId.set(workflow.projectId.toString(), workflow);
      }
    }

    for (const project of projects) {
      if (workflowMapByProjectId.has(project._id.toString())) {
        continue;
      }

      const workflow = project.workflowId ? workflowMapById.get(project.workflowId.toString()) : null;
      if (workflow) {
        workflowMapByProjectId.set(project._id.toString(), workflow);
      }
    }

    return workflowMapByProjectId;
  }

  // 1. GROUP BY: Project only
  async getProjectsOnly(projects) {
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
  async getProjectsWithSprints(projects) {
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
  async getProjectsWithSprintsAndTasks(projects, assigneeIds, filter = {}) {
    const workflowMapByProjectId = await this.getWorkflowMapByProjectIds(projects.map((project) => project._id));
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
      };
      // Get tasks for each sprint
      for (const sprint of sprints) {
        let sprintTaskQuery = { ...taskQuery, sprintId: sprint._id };
        const sprintTasks = await Task.find(sprintTaskQuery).sort({ createdAt: -1 });
        const workflow = workflowMapByProjectId.get(project._id.toString());
        projectData.sprints.push({
          id: sprint._id,
          name: sprint.name,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          status: sprint.status,
          tasks: await Promise.all(sprintTasks.map((t) => this.formatTask(t, workflow))),
        });
      }
      // Get backlog tasks (tasks without sprint) and add as a pseudo-sprint
      const backlogTaskQuery = { ...taskQuery, sprintId: null };
      const backlogTasks = await Task.find(backlogTaskQuery).sort({ createdAt: -1 });
      // Add backlog as a special sprint at the same level as other sprints
      if (backlogTasks.length > 0) {
        const workflow = workflowMapByProjectId.get(project._id.toString());
        projectData.sprints.push({
          id: `backlog-${project._id}`,
          name: "Backlog",
          startDate: project.startDate,
          endDate: project.endDate,
          status: "backlog",
          isBacklog: true,
          tasks: await Promise.all(backlogTasks.map((t) => this.formatTask(t, workflow))),
        });
      }
      result.push(projectData);
    }
    return {
      type: "project-sprint-task",
      data: result,
    };
  }
  // 4. GROUP BY: Project + Task (no sprint)
  async getProjectsWithTasks(projects, assigneeIds, filter = {}) {
    const workflowMapByProjectId = await this.getWorkflowMapByProjectIds(projects.map((project) => project._id));
    const result = [];
    for (const project of projects) {
      // Build task query
      let taskQuery = { projectId: project._id };
      if (assigneeIds.length > 0) {
        taskQuery.assigneeId = { $in: assigneeIds };
      }
      // Lọc theo ngày nếu có
      if (filter.startDate) {
        taskQuery.startDate = { $gte: new Date(filter.startDate) };
      }
      if (filter.endDate) {
        taskQuery.dueDate = taskQuery.dueDate || {};
        taskQuery.dueDate.$lte = new Date(filter.endDate);
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
      const workflow = workflowMapByProjectId.get(project._id.toString());
      projectData.tasks = await Promise.all(tasks.map((t) => this.formatTask(t, workflow)));
      result.push(projectData);
    }
    return {
      type: "project-task",
      data: result,
    };
  }

  // 5. GROUP BY: Sprint only (no project)
  async getSprintsOnly(projectIds) {
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
  async getSprintsWithTasks(projectIds, assigneeIds, filter = {}) {
    let sprintQuery = {};

    if (projectIds.length > 0) {
      sprintQuery.projectId = { $in: projectIds };
    }

    const sprints = await Sprint.find(sprintQuery).sort({ startDate: 1 });
    const workflowMapByProjectId = await this.getWorkflowMapByProjectIds(sprints.map((sprint) => sprint.projectId));
    const result = [];

    // Get unique project IDs from sprints
    const sprintProjectIds = [...new Set(sprints.map((s) => s.projectId.toString()))];

    for (const sprint of sprints) {
      // Build task query for this sprint
      let taskQuery = { sprintId: sprint._id };
      if (assigneeIds.length > 0) {
        taskQuery.assigneeId = { $in: assigneeIds };
      }
      if (filter.startDate) {
        taskQuery.startDate = { $gte: new Date(filter.startDate) };
      }
      if (filter.endDate) {
        taskQuery.dueDate = taskQuery.dueDate || {};
        taskQuery.dueDate.$lte = new Date(filter.endDate);
      }

      const tasks = await Task.find(taskQuery).sort({ createdAt: -1 });
      const workflow = sprint.projectId ? workflowMapByProjectId.get(sprint.projectId.toString()) : null;

      result.push({
        id: sprint._id,
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        status: sprint.status,
        projectId: sprint.projectId,
        tasks: await Promise.all(tasks.map((t) => this.formatTask(t, workflow))),
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
      if (filter.startDate) {
        backlogTaskQuery.startDate = { $gte: new Date(filter.startDate) };
      }
      if (filter.endDate) {
        backlogTaskQuery.dueDate = backlogTaskQuery.dueDate || {};
        backlogTaskQuery.dueDate.$lte = new Date(filter.endDate);
      }
      const tasks = await Task.find(backlogTaskQuery).sort({ createdAt: -1 });
      const workflow = workflowMapByProjectId.get(projectId.toString());
      backlogTasks.push(...(await Promise.all(tasks.map((t) => this.formatTask(t, workflow)))));
    }

    return {
      type: "sprint-task",
      data: result,
      backlogTasks: backlogTasks,
    };
  }

  // 7. GROUP BY: Task only (no project, no sprint)
  async getTasksOnly(projectIds, assigneeIds, filter = {}) {
    let taskQuery = {};
    if (projectIds.length > 0) {
      taskQuery.projectId = { $in: projectIds };
    }
    if (assigneeIds.length > 0) {
      taskQuery.assigneeId = { $in: assigneeIds };
    }
    if (filter.startDate) {
      taskQuery.startDate = { $gte: new Date(filter.startDate) };
    }
    if (filter.endDate) {
      taskQuery.dueDate = taskQuery.dueDate || {};
      taskQuery.dueDate.$lte = new Date(filter.endDate);
    }
    const tasks = await Task.find(taskQuery).sort({ createdAt: -1 });
    const workflowMapByProjectId = await this.getWorkflowMapByProjectIds(tasks.map((task) => task.projectId));

    return {
      type: "task",
      data: await Promise.all(
        tasks.map((t) => {
          const workflow = t.projectId ? workflowMapByProjectId.get(t.projectId.toString()) : null;
          return this.formatTask(t, workflow);
        }),
      ),
    };
  }

  // Helper: Format task object
  async formatTask(task, workflow = null) {
    let lastLog = await TimeLog.findOne({ taskId: task._id }).sort({ createdAt: -1 }).select("createdAt").lean();
    const lastLogTime = lastLog ? lastLog.createdAt : null;
    const statusIdValue = task?.statusId?.toString?.() || task?.statusId?._id?.toString?.();
    const resolvedStatus = workflow?.statuses?.find((status) => status._id.toString() === statusIdValue);

    const normalizedStatus = resolvedStatus
      ? {
          _id: resolvedStatus._id,
          name: resolvedStatus.name,
          category: resolvedStatus.category,
        }
      : task.statusId;

    return {
      id: task._id,
      key: task.key,
      name: task.name,
      description: task.description,
      status: normalizedStatus,
      priority: task.priorityId,
      taskType: task.taskTypeId,
      assignee: task.assigneeId,
      reporter: task.reporterId,
      startDate: task.startDate,
      dueDate: task.dueDate,
      estimatedTime: task.estimatedTime,
      actualTime: task.actualTime,
      progress: task.progress,
      lastLogTime,
    };
  }
}

module.exports = new GanttService();
