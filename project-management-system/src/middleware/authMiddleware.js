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

const getProjectRole = async (userId, projectKey) => {
  console.log(`[DEBUG] 3.1. ENTERING 'getProjectRole' for project key: ${projectKey}`);
  if (!userId || !projectKey) {
    console.log("[DEBUG] ERROR: userId or projectKey is missing in getProjectRole.");
    return null;
  }
  
  try {
    console.log(`[DEBUG] 3.2. AWAITING Project.findOne for key: ${projectKey.toUpperCase()}`);
    const project = await Project.findOne({ key: projectKey.toUpperCase() });
    console.log("[DEBUG] 3.3. COMPLETED Project.findOne. Found project:", project ? project.name : "Not Found");

    if (!project) return null;

    const member = project.members.find(m => m.userId.equals(userId));
    console.log("[DEBUG] 3.4. User role in project is:", member ? member.role : "Not a member");
    return member ? member.role : null;
  } catch (dbError) {
    console.error("[DEBUG] FATAL DATABASE ERROR in getProjectRole:", dbError);
    return null; // Trả về null để middleware cha xử lý
  }
};

const isProjectMember = async (req, res, next) => {
    try {
        // Lấy đúng tên biến từ URL. Trong App.js, bạn đã định nghĩa là ':projectKey'
        const role = await getProjectRole(req.user._id, req.params.projectKey); 
        if (role) {
            req.projectRole = role; 
            return next();
        }
        return res.status(403).json({ message: "Forbidden: You are not a member of this project." });
    } catch (error) {
    console.error("[DEBUG] FATAL ERROR in 'isProjectMember':", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: "Forbidden: Admin access required" });
};

// Kiểm tra có phải Leader hoặc PM không
const isManagerOrLeader = async (req, res, next) => {
    try {
        // SỬA Ở ĐÂY: Dùng req.params.key
        const role = await getProjectRole(req.user._id, req.params.projectKey); 
        if (role === 'PROJECT_MANAGER' || role === 'LEADER') {
            req.projectRole = role;
            return next();
        }
        return res.status(403).json({ message: "Forbidden: Manager or Leader access required." });
    } catch (error) {
        console.error("Error in isManagerOrLeader middleware:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Kiểm tra có phải PM không
const isProjectManager = async (req, res, next) => {
    try {
        // SỬA Ở ĐÂY: Dùng req.params.key
                const role = await getProjectRole(req.user._id, req.params.projectKey); 

        if (role === 'PROJECT_MANAGER') {
            req.projectRole = role;
            return next();
        }
        return res.status(403).json({ message: "Forbidden: Project Manager access required." });
    } catch (error) {
        console.error("Error in isProjectManager middleware:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { protect, admin, isProjectMember, isManagerOrLeader, isProjectManager };