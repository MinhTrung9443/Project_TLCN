const projectService = require('../services/ProjectService');

const handleCreateProject = async (req, res) => {
  try {
    const projectData = req.body;
    const newProject = await projectService.createProject(projectData);
    res.status(201).json(newProject);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Server Error' });
  }
};

const handleGetAllProjects = async (req, res) => {
  try {
    const projects = await projectService.getAllProjects();
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

const handleUpdateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const projectData = req.body;
    const updatedProject = await projectService.updateProject(id, projectData);
    res.status(200).json(updatedProject);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Server Error' });
  }
};

const handleDeleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.deleteProject(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Server Error' });
  }
};

const handleCloneProject = async (req, res) => {
  try {
    const { id } = req.params; 
    const cloneData = req.body; 
    const clonedProject = await projectService.cloneProject(id, cloneData);
    res.status(201).json(clonedProject);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Server Error' });
  }
};

const handleGetProjectByKey = async (req, res) => {
  try {
    const { key } = req.params; 
    const project = await projectService.getProjectByKey(key);
    res.status(200).json(project);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Server Error' });
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
    const { groupId } = req.body;
    const result = await projectService.addGroupToProject(key, { groupId });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
module.exports = {
  handleCreateProject,
  handleGetAllProjects,
  handleUpdateProject,
  handleDeleteProject,
  handleCloneProject,
  handleGetProjectByKey,
  handleGetProjectMembers,
  handleAddMemberToProject,
  handleAddGroupToProject
};