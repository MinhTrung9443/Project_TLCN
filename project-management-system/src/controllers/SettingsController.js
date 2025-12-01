const Project = require("../models/Project");
const TaskType = require("../models/TaskType");
const Priority = require("../models/Priority");
const Platform = require("../models/Platform");

const getCreateTaskFormData = async (req, res) => {
  try {
    const { projectKey } = req.params;
    const userId = req.user.id; // Get current user ID from auth middleware

    const project = await Project.findOne({ key: projectKey.toUpperCase() })
      .populate("members.userId", "fullname email avatar role")
      .populate("teams.members", "fullname email avatar")
      .populate("teams.leaderId", "fullname email avatar");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const projectId = project._id;

    const findTaskTypes = TaskType.find({ projectId });
    const findPriorities = Priority.find({ projectId }).sort({ level: "asc" });
    const findPlatforms = Platform.find({ projectId });
    const [taskTypes, priorities, platforms] = await Promise.all([findTaskTypes, findPriorities, findPlatforms]);

    // Determine user role in project
    const User = require("../models/User");
    const currentUser = await User.findById(userId);
    const isAdmin = currentUser && currentUser.role === "admin";
    const isPM = project.members.some((m) => (m.userId._id || m.userId).toString() === userId.toString() && m.role === "PROJECT_MANAGER");
    const leaderTeam = project.teams.find((t) => (t.leaderId._id || t.leaderId).toString() === userId.toString());
    const isLeader = !!leaderTeam;

    let allMembers = [];

    // If Admin or PM: Load all members from project and teams
    if (isAdmin || isPM) {
      const allMembersMap = new Map();

      // Add project members (PM, etc)
      if (project.members) {
        project.members.forEach((member) => {
          if (member.userId && member.userId._id) {
            const userId = member.userId._id.toString();
            if (!allMembersMap.has(userId)) {
              allMembersMap.set(userId, {
                userId: member.userId,
                role: member.role,
              });
            }
          }
        });
      }

      // Add team members and leaders
      if (project.teams) {
        project.teams.forEach((team) => {
          // Add team leader
          if (team.leaderId) {
            const leaderId = (team.leaderId._id || team.leaderId).toString();
            if (!allMembersMap.has(leaderId)) {
              allMembersMap.set(leaderId, {
                userId: team.leaderId,
                role: "LEADER",
              });
            }
          }

          // Add team members
          if (team.members) {
            team.members.forEach((member) => {
              if (member && member._id) {
                const memberId = member._id.toString();
                if (!allMembersMap.has(memberId)) {
                  allMembersMap.set(memberId, {
                    userId: member,
                    role: "MEMBER",
                  });
                }
              }
            });
          }
        });
      }

      allMembers = Array.from(allMembersMap.values());
      console.log(`Project ${projectKey} (Admin/PM): Found ${allMembers.length} unique members`);
    }
    // If Leader: Load only their team members + themselves
    else if (isLeader && leaderTeam) {
      const teamMembersMap = new Map();

      // Add leader themselves
      if (leaderTeam.leaderId) {
        const leaderId = (leaderTeam.leaderId._id || leaderTeam.leaderId).toString();
        teamMembersMap.set(leaderId, {
          userId: leaderTeam.leaderId,
          role: "LEADER",
        });
      }

      // Add team members
      if (leaderTeam.members) {
        leaderTeam.members.forEach((member) => {
          if (member && member._id) {
            const memberId = member._id.toString();
            if (!teamMembersMap.has(memberId)) {
              teamMembersMap.set(memberId, {
                userId: member,
                role: "MEMBER",
              });
            }
          }
        });
      }

      allMembers = Array.from(teamMembersMap.values());
      console.log(`Project ${projectKey} (Leader): Found ${allMembers.length} team members`);
    }

    res.status(200).json({
      taskTypes,
      priorities,
      platforms,
      members: allMembers,
    });
  } catch (error) {
    console.error("Error in getCreateTaskFormData:", error);
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

module.exports = { getCreateTaskFormData };
