const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Project = require("../models/Project");

const protect = async (req, res, next) => {
  console.log(`[DEBUG] 1. ENTERING 'protect' for URL: ${req.originalUrl}`);
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      console.log("[DEBUG] 1.1. Finding user by ID:", decoded.id);
      req.user = await User.findById(decoded.id).select("-password");
      console.log("[DEBUG] 1.2. Found user:", req.user ? req.user.email : "Not Found");

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      console.log("[DEBUG] 2. EXITING 'protect' successfully.");
      next();
    } catch (error) {
      console.error("[DEBUG] ERROR in 'protect':", error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

const canAssignTask = async (req, res, next) => {
  try {
    const actor = req.user; // Người thực hiện hành động (đã được 'protect' lấy ra)
    const { assigneeId } = req.body; // Người sẽ được gán task
    const { projectKey } = req.params;

    const project = await Project.findOne({ key: projectKey.toUpperCase() }).populate("teams");
    if (!project) return res.status(404).json({ message: "Project not found" });

    const actorAsMember = project.members.find((m) => m.userId.equals(actor._id));

    // TRƯỜNG HỢP 1: Nếu người thực hiện là PM, họ có toàn quyền
    if (actorAsMember && actorAsMember.role === "PROJECT_MANAGER") {
      return next();
    }

    // TRƯỜNG HỢP 2: Nếu người thực hiện là Leader
    if (actorAsMember && actorAsMember.role === "LEADER") {
      // Tìm tất cả các team mà người này làm Leader
      const ledTeams = project.teams.filter((t) => t.leaderId.equals(actor._id));
      const ledTeamIds = ledTeams.map((t) => t.teamId);

      // Lấy danh sách tất cả member thuộc các team mà người này lead
      const manageableMembers = await User.find({ group: { $in: ledTeamIds } }).select("_id");
      const manageableMemberIds = manageableMembers.map((m) => m._id.toString());

      // Kiểm tra xem người được gán task có nằm trong danh sách quản lý được không
      if (manageableMemberIds.includes(assigneeId)) {
        return next();
      }
    }

    // Nếu không thuộc 2 trường hợp trên, từ chối
    return res.status(403).json({ message: "Forbidden: You do not have permission to assign this task." });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden: Admin access required" });
};

const getProjectRole = async (userId, projectKey) => {
  if (!userId || !projectKey) return null;

  try {
    const project = await Project.findOne({ key: projectKey.toUpperCase() });
    if (!project) return null;

    // 1. Kiểm tra trong project.members trước (ưu tiên cao hơn)
    const member = project.members.find((m) => m.userId && m.userId.equals(userId));
    if (member) return member.role;

    // 2. Nếu không có trong members, kiểm tra trong teams
    for (const team of project.teams) {
      // Kiểm tra nếu là leader của team
      if (team.leaderId && team.leaderId.equals(userId)) {
        return "LEADER";
      }
      // Kiểm tra nếu là member của team
      if (team.members && team.members.some((m) => m.equals(userId))) {
        return "MEMBER";
      }
    }

    // 3. Không tìm thấy ở đâu cả
    return null;
  } catch (dbError) {
    console.error("DATABASE ERROR in getProjectRole:", dbError);
    return null;
  }
};

const isProjectMember = async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  // 2. Nếu không phải Admin, kiểm tra vai trò trong dự án
  try {
    const role = await getProjectRole(req.user._id, req.params.projectKey);
    if (role) {
      req.projectRole = role;
      return next();
    }
    return res.status(403).json({ message: "Forbidden: You are not a member of this project." });
  } catch (error) {
    console.error("Error in isProjectMember middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const isManagerOrLeader = async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  try {
    const role = await getProjectRole(req.user._id, req.params.projectKey);
    if (role === "PROJECT_MANAGER" || role === "LEADER") {
      req.projectRole = role;
      return next();
    }
    return res.status(403).json({ message: "Forbidden: Manager or Leader access required." });
  } catch (error) {
    console.error("Error in isManagerOrLeader middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const isProjectManager = async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  try {
    const role = await getProjectRole(req.user._id, req.params.projectKey);
    if (role === "PROJECT_MANAGER") {
      req.projectRole = role;
      return next();
    }
    return res.status(403).json({ message: "Forbidden: Project Manager access required." });
  } catch (error) {
    console.error("Error in isProjectManager middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check if user is admin or PM of sprint's project
const isSprintManager = async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  try {
    const { sprintId } = req.params;

    // Import Sprint model dynamically to avoid circular dependency
    const Sprint = require("../models/Sprint");
    const sprint = await Sprint.findById(sprintId).populate("projectId");

    if (!sprint) {
      return res.status(404).json({ message: "Sprint not found" });
    }

    const project = sprint.projectId;
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user is PM of this project
    const member = project.members.find((m) => m.userId.equals(req.user._id));
    if (member && member.role === "PROJECT_MANAGER") {
      return next();
    }

    return res.status(403).json({ message: "Forbidden: Project Manager access required" });
  } catch (error) {
    console.error("Error in isSprintManager middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  protect,
  admin,
  isProjectMember,
  canAssignTask,
  isManagerOrLeader,
  isProjectManager,
  isSprintManager,
};
