const Project = require("../models/Project");

const normalizeProjectStatus = (projectStatus) => {
  if (!projectStatus) return "active";
  const normalized = String(projectStatus).trim().toLowerCase();
  if (normalized === "any" || normalized === "all") return "any";
  if (normalized === "complete" || normalized === "completed") return "completed";
  if (normalized === "paused") return "paused";
  return "active";
};

async function getUserTaskAccessContext(user, options = {}) {
  const projectStatus = normalizeProjectStatus(options.projectStatus);

  if (!user) {
    return {
      isAdmin: false,
      projectStatus,
      projects: [],
      allowedProjectIds: [],
      managedProjectIds: [],
      managedMemberIds: [],
      projectRoleMap: new Map(),
    };
  }

  if (user.role === "admin") {
    return {
      isAdmin: true,
      projectStatus,
      projects: [],
      allowedProjectIds: [],
      managedProjectIds: [],
      managedMemberIds: [],
      projectRoleMap: new Map(),
    };
  }

  const membershipFilter = {
    isDeleted: false,
    $or: [{ "members.userId": user._id }, { "teams.leaderId": user._id }, { "teams.members": user._id }],
  };

  if (projectStatus !== "any") {
    membershipFilter.status = projectStatus;
  }

  const projects = await Project.find(membershipFilter).lean();
  const allowedProjectIds = projects.map((project) => project._id.toString());
  const managedProjectIds = [];
  const managedMemberIds = new Set();
  const projectRoleMap = new Map();

  for (const project of projects) {
    const member = (project.members || []).find((item) => item.userId?.toString() === user._id.toString());
    if (member?.role === "PROJECT_MANAGER") {
      projectRoleMap.set(project._id.toString(), "PROJECT_MANAGER");
      managedProjectIds.push(project._id.toString());
      continue;
    }

    const isLeader = (project.teams || []).some((team) => team.leaderId?.toString() === user._id.toString());
    if (isLeader) {
      projectRoleMap.set(project._id.toString(), "LEADER");
      managedProjectIds.push(project._id.toString());
      managedMemberIds.add(user._id.toString());

      for (const team of project.teams || []) {
        if (team.leaderId?.toString() === user._id.toString()) {
          (team.members || []).forEach((memberId) => managedMemberIds.add(memberId.toString()));
        }
      }
      continue;
    }

    if (member) {
      projectRoleMap.set(project._id.toString(), member.role || "MEMBER");
    }
  }

  return {
    isAdmin: false,
    projectStatus,
    projects,
    allowedProjectIds,
    managedProjectIds,
    managedMemberIds: Array.from(managedMemberIds),
    projectRoleMap,
  };
}

async function assertTaskAccessByKey(user, task) {
  if (!task) return false;
  if (!user || user.role === "admin") return true;

  const context = await getUserTaskAccessContext(user, { projectStatus: "any" });
  const projectId = task.projectId?._id?.toString?.() || task.projectId?.toString?.();
  const userId = user._id.toString();

  if (task.assigneeId?._id?.toString?.() === userId || task.assigneeId?.toString?.() === userId) {
    return true;
  }

  if (task.reporterId?._id?.toString?.() === userId || task.reporterId?.toString?.() === userId) {
    return true;
  }

  if (task.createdById?._id?.toString?.() === userId || task.createdById?.toString?.() === userId) {
    return true;
  }

  if (projectId && context.managedProjectIds.includes(projectId)) {
    return true;
  }

  return false;
}

module.exports = { normalizeProjectStatus, getUserTaskAccessContext, assertTaskAccessByKey };
