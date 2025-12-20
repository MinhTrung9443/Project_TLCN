const Project = require("../models/Project");

async function getAccessibleTasksQuery(user) {
  if (user.role === "admin") return {};

  // Lấy các project mà user là PM
  const projects = await Project.find({});
  const pmProjectIds = projects
    .filter((project) => project.members?.some((m) => m.userId.toString() === user._id.toString() && m.role === "PROJECT_MANAGER"))
    .map((p) => p._id);

  if (user.role === "PROJECT_MANAGER") {
    return {
      $or: [{ projectId: { $in: pmProjectIds } }, { assigneeId: user._id }],
    };
  }

  if (user.role === "TEAM_LEADER") {
    // Lấy các project mà user là leader ở bất kỳ team nào
    const leadProjects = await Project.find({ "teams.leaderId": user._id });
    // Lấy tất cả memberId của các team mà user là leader
    let leadMemberIds = new Set([user._id.toString()]);
    for (const project of leadProjects) {
      for (const team of project.teams || []) {
        if (team.leaderId?.toString() === user._id.toString()) {
          (team.members || []).forEach((m) => leadMemberIds.add(m.userId.toString()));
        }
      }
    }
    return {
      $or: [{ assigneeId: { $in: Array.from(leadMemberIds) } }, { reporterId: { $in: Array.from(leadMemberIds) } }],
    };
  }

  // Member thường
  return { assigneeId: user._id };
}

module.exports = { getAccessibleTasksQuery };
