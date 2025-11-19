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

const handleAddGroupToProject = async (req, res) => {
  try {
    const { projectKey } = req.params;
    const { groupId, role } = req.body;

    if (!groupId || !role) {
      return res.status(400).json({ message: "groupId and role are required." });
    }

    const result = await projectService.addMembersFromGroupToProject(projectKey, { groupId, role }, req.user);

    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};


// === 3. HÀNH ĐỘNG CỦA MỌI THÀNH VIÊN DỰ ÁN ===

const handleGetAllProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    const projects = await projectService.getAllProjects(userId);
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
};