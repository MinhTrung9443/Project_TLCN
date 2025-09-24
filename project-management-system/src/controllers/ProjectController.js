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

module.exports = {
  handleCreateProject,
  handleGetAllProjects,
};