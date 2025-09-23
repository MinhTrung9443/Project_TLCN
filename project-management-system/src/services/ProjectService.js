const Project = require('../models/Project');

const createProject = async (projectData) => {
  const { key, projectLeaderId } = projectData;

  // 1. Kiểm tra xem 'key' của project đã tồn tại chưa
  const projectExists = await Project.findOne({ key: key.toUpperCase() });
  if (projectExists) {
    const error = new Error('Project key already exists');
    error.statusCode = 400; // Bad Request
    throw error;
  }

  // 2. Tạo project mới
  const newProject = new Project({
    ...projectData,
    members: [{ userId: projectLeaderId, role: 'Project Manager' }],
  });

  return await newProject.save();
};

const getAllProjects = async () => {
  const projects = await Project.find({ isDeleted: false })
    .populate('projectLeaderId', 'fullname email avatar') 
    .sort({ createdAt: -1 });
  return projects;
};

module.exports = {
  createProject,
  getAllProjects,
};