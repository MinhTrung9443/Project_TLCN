const projectService = require("../services/ProjectService");

const handleCreateProject = async (req, res) => {
  try {
    const projectData = req.body; 
    const userId = req.user._id; 
    const newProject = await projectService.createProject(projectData, userId);
    res.status(201).json(newProject);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};
const handleCloneProject = async (req, res) => {
  try {
    const { id } = req.params; 
    const cloneData = req.body; 
    const userId = req.user._id;
    const clonedProject = await projectService.cloneProject(id, cloneData, userId);
    res.status(201).json(clonedProject);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};
const handleGetArchivedProjects = async (req, res) => {
  try {
    const projects = await projectService.getArchivedProjects();
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
  }
};
const handleRestoreProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const result = await projectService.restoreProject(id, userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};
const handlePermanentlyDeleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const result = await projectService.permanentlyDeleteProject(id, userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};


// === 2. HÀNH ĐỘNG CỦA PROJECT MANAGER ===

const handleUpdateProjectByKey = async (req, res) => {
  try {
    const { projectKey } = req.params;
    const projectData = req.body;
    const userId = req.user._id;
    const updatedProject = await projectService.updateProjectByKey(projectKey, projectData, userId);
    res.status(200).json(updatedProject);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleArchiveProjectByKey = async (req, res) => {
  try {
    const { projectKey } = req.params;
    const userId = req.user._id;
    const result = await projectService.archiveProjectByKey(projectKey, userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleAddMemberToProject = async (req, res) => {
  try {
    const { projectKey } = req.params;
    const { userId, role } = req.body;
    const result = await projectService.addMemberToProject(projectKey, { userId, role }, req.user);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
// controllers/ProjectController.js (BACKEND)

const handleAddGroupToProject = async (req, res) => {
  try {
    const { projectKey } = req.params;
    // [SỬA] - Nhận 'memberIds' thay vì 'roleForOthers'
    const { groupId, leaderId, memberIds } = req.body;

    // [SỬA] - Cập nhật lại validation
    if (!groupId || !leaderId || !memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ message: "Group ID, Leader ID, and a list of Member IDs are required." });
    }

    const result = await projectService.addMembersFromGroupToProject(
        projectKey, 
        { groupId, leaderId, memberIds }, // Truyền dữ liệu mới
        req.user
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("--- ERROR IN handleAddGroupToProject ---", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleGetAllProjects = async (req, res) => {
  try {
    const projects = await projectService.getAllProjects(req.user); 
    
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

const handleGetProjectByKey = async (req, res) => {
  try {
    const { projectKey } = req.params;
    const project = await projectService.getProjectByKey(projectKey);
    res.status(200).json(project);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleGetProjectMembers = async (req, res) => {
  try {
    const { projectKey } = req.params;
    const members = await projectService.getProjectMembers(projectKey);
    res.status(200).json(members);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const handleRemoveMember = async (req, res) => {
    try {
        const { projectKey, userId } = req.params;
        const updatedProject = await projectService.removeMemberFromProject(projectKey, userId);
        res.status(200).json(updatedProject);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// 2. Xóa Team khỏi Dự án
const handleRemoveTeam = async (req, res) => {
    try {
        const { projectKey, teamId } = req.params;
        const updatedProject = await projectService.removeTeamFromProject(projectKey, teamId);
        res.status(200).json(updatedProject);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// 3. Thay đổi Vai trò của Member
const handleChangeMemberRole = async (req, res) => {
    try {
        const { projectKey, userId } = req.params;
        const { newRole } = req.body;
        if (!newRole) {
            return res.status(400).json({ message: "newRole is required." });
        }
        const updatedProject = await projectService.changeMemberRole(projectKey, userId, newRole);
        res.status(200).json(updatedProject);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

// 4. Thay đổi Leader của một Team
const handleChangeTeamLeader = async (req, res) => {
    try {
        const { projectKey, teamId } = req.params;
        const { newLeaderId } = req.body;
        if (!newLeaderId) {
            return res.status(400).json({ message: "newLeaderId is required." });
        }
        const updatedProject = await projectService.changeTeamLeader(projectKey, teamId, newLeaderId);
        res.status(200).json(updatedProject);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

module.exports = {
  // Admin
  handleCreateProject,
  handleCloneProject,
  handleGetArchivedProjects,
  handleRestoreProject,
  handlePermanentlyDeleteProject,
  // Project Manager
  handleUpdateProjectByKey,
  handleArchiveProjectByKey,
  handleAddMemberToProject,
  handleAddGroupToProject,
  // Members
  handleGetAllProjects,
  handleGetProjectByKey,
  handleGetProjectMembers,

  handleRemoveMember,
  handleRemoveTeam,
  handleChangeMemberRole,
  handleChangeTeamLeader,
};