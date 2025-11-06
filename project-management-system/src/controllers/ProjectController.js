const projectService = require("../services/ProjectService");

const handleCreateProject = async (req, res) => {
  try {
    const projectData = req.body;
    const userId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;
    const newProject = await projectService.createProject(projectData, userId);
    res.status(201).json(newProject);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleGetAllProjects = async (req, res) => {
  try {
    const projects = await projectService.getAllProjects();
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
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
const handleUpdateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const projectData = req.body;
    const userId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : undefined;
    const updatedProject = await projectService.updateProject(id, projectData, userId);
    res.status(200).json(updatedProject);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleCloneProject = async (req, res) => {
  try {
    const { id } = req.params;
    const cloneData = req.body;
    const clonedProject = await projectService.cloneProject(id, cloneData);
    res.status(201).json(clonedProject);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleGetProjectByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const project = await projectService.getProjectByKey(key);
    res.status(200).json(project);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleGetProjectMembers = async (req, res) => {
  try {
    const { key } = req.params;
    const members = await projectService.getProjectMembers(key);
    res.status(200).json(members);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const handleAddMemberToProject = async (req, res) => {
  try {
    const { key } = req.params;
    const { userId, role } = req.body;
    const result = await projectService.addMemberToProject(key, { userId, role });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const handleAddGroupToProject = async (req, res) => {
  try {
    const { key } = req.params;
    // req.body bây giờ là một object { groupId, role }
    const { groupId, role } = req.body;

    // Kiểm tra xem có nhận đủ dữ liệu không
    if (!groupId || !role) {
      return res.status(400).json({ message: "groupId and role are required." });
    }

    // Truyền object vào service
    const result = await projectService.addGroupToProject(key, { groupId, role });

    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleArchiveProject = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.archiveProject(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handleRestoreProject = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.restoreProject(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

const handlePermanentlyDeleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.permanentlyDeleteProject(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
  }
};

module.exports = {
  handleCreateProject,
  handleGetAllProjects,
  handleGetArchivedProjects,
  handleUpdateProject,
  handleArchiveProject,
  handleRestoreProject,
  handlePermanentlyDeleteProject,
  handleCloneProject,
  handleGetProjectByKey,
  handleGetProjectMembers,
  handleAddMemberToProject,
  handleAddGroupToProject,
};
