const Project = require('../models/Project');
const TaskType = require('../models/TaskType'); 
const Priority = require('../models/Priority'); 
const Platform = require('../models/Platform'); 

const copyDefaultSettingsForProject = async (projectId) => {
  const findDefaultTaskTypes = TaskType.find({ projectId: null });
  const findDefaultPriorities = Priority.find({ projectId: null });
  const findDefaultPlatforms = Platform.find({ projectId: null });

  const [defaultTaskTypes, defaultPriorities, defaultPlatforms] = await Promise.all([
    findDefaultTaskTypes,
    findDefaultPriorities,
    findDefaultPlatforms,
  ]);

  const newTaskTypes = defaultTaskTypes.map((item) => {
    const newItem = item.toObject();
    delete newItem._id; 
    newItem.projectId = projectId;
    return newItem;
  });

  const newPriorities = defaultPriorities.map((item) => {
    const newItem = item.toObject();
    delete newItem._id;
    newItem.projectId = projectId;
    return newItem;
  });

  const newPlatforms = defaultPlatforms.map((item) => {
    const newItem = item.toObject();
    delete newItem._id;
    newItem.projectId = projectId;
    return newItem;
  });

  const insertTaskTypes = newTaskTypes.length > 0 ? TaskType.insertMany(newTaskTypes) : Promise.resolve();
  const insertPriorities = newPriorities.length > 0 ? Priority.insertMany(newPriorities) : Promise.resolve();
  const insertPlatforms = newPlatforms.length > 0 ? Platform.insertMany(newPlatforms) : Promise.resolve();

  await Promise.all([insertTaskTypes, insertPriorities, insertPlatforms]);
};


const createProject = async (projectData) => {
  const { key, projectLeaderId } = projectData;

  const projectExists = await Project.findOne({ key: key.toUpperCase() });
  if (projectExists) {
    const error = new Error('Project key already exists');
    error.statusCode = 400;
    throw error;
  }

  const newProject = new Project({
    ...projectData,
    members: [{ userId: projectLeaderId, role: 'Project Manager' }],
  });

  const savedProject = await newProject.save();

  try {
    await copyDefaultSettingsForProject(savedProject._id);
  } catch (copyError) {
    console.error(`Failed to copy default settings for project ${savedProject._id}:`, copyError);
  }

  return savedProject;
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