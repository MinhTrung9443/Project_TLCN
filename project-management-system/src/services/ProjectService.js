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

const copySettingsFromSourceProject = async (sourceProjectId, newProjectId) => {
  const findSourceTaskTypes = TaskType.find({ projectId: sourceProjectId });
  const findSourcePriorities = Priority.find({ projectId: sourceProjectId });
  const findSourcePlatforms = Platform.find({ projectId: sourceProjectId });

  const [sourceTaskTypes, sourcePriorities, sourcePlatforms] = await Promise.all([
    findSourceTaskTypes,
    findSourcePriorities,
    findSourcePlatforms,
  ]);

  const newTaskTypes = sourceTaskTypes.map((item) => {
    const newItem = item.toObject();
    delete newItem._id;
    newItem.projectId = newProjectId;
    return newItem;
  });

  const newPriorities = sourcePriorities.map((item) => {
    const newItem = item.toObject();
    delete newItem._id;
    newItem.projectId = newProjectId;
    return newItem;
  });

  const newPlatforms = sourcePlatforms.map((item) => {
    const newItem = item.toObject();
    delete newItem._id;
    newItem.projectId = newProjectId;
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

const updateProject = async (projectId, projectData) => {
  const { key } = projectData;

  if (key) {
    const projectExists = await Project.findOne({ 
      key: key.toUpperCase(), 
      _id: { $ne: projectId } 
    });
    if (projectExists) {
      const error = new Error('Project key already exists');
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedProject = await Project.findByIdAndUpdate(projectId, projectData, { new: true });

  if (!updatedProject) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  return updatedProject;
};

const deleteProject = async (projectId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }
  
  project.isDeleted = true;
  project.deletedAt = new Date();
  await project.save();

  return { message: 'Project deleted successfully' };
};

const cloneProject = async (sourceProjectId, cloneData) => {
  const { name, key, projectLeaderId } = cloneData;

  const keyExists = await Project.findOne({ key: key.toUpperCase() });
  if (keyExists) {
    const error = new Error('New project key already exists');
    error.statusCode = 400;
    throw error;
  }

  const sourceProject = await Project.findById(sourceProjectId).lean();
  if (!sourceProject) {
    const error = new Error('Source project not found');
    error.statusCode = 404;
    throw error;
  }

  delete sourceProject._id;
  delete sourceProject.createdAt;
  delete sourceProject.updatedAt;

  const newProjectData = {
    ...sourceProject,
    name,
    key,
    projectLeaderId,
    members: [{ userId: projectLeaderId, role: 'Project Manager' }],
    status: 'active',
    isDeleted: false,
    deletedAt: null,
  };
  
  const clonedProject = new Project(newProjectData);
  await clonedProject.save();

  try {
    await copySettingsFromSourceProject(sourceProjectId, clonedProject._id);
  } catch (copyError) {
    console.error(`Failed to copy settings for cloned project ${clonedProject._id}:`, copyError);
  }

  return clonedProject;
};

const getProjectByKey = async (key) => {
  const project = await Project.findOne({ key: key.toUpperCase(), isDeleted: false })
    .populate('projectLeaderId', 'fullname email avatar');
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  return project;
};

const getProjectMembers = async (projectKey) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase(), isDeleted: false })
    // Populate lồng nhau: đi vào mảng 'members', và với mỗi object, populate trường 'userId'
    .populate({
      path: 'members.userId',
      select: 'fullname email avatar' // Chỉ lấy các trường cần thiết của user
    });

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }
  return project.members;
};

// THÊM THÀNH VIÊN MỚI VÀO PROJECT
const addMemberToProject = async (projectKey, { userId, role }) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra xem user đã là thành viên chưa
  const isAlreadyMember = project.members.some(member => member.userId.equals(userId));
  if (isAlreadyMember) {
    const error = new Error('User is already a member of this project');
    error.statusCode = 400; // Bad Request
    throw error;
  }

  project.members.push({ userId, role, addedOn: new Date() }); // Giả sử schema có trường addedOn
  await project.save();
  return { message: 'Member added successfully' };
};

const addGroupToProject = async (projectKey, { groupId }) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) { /* ... xử lý lỗi ... */ }

  // Kiểm tra xem group đã tồn tại trong project chưa
  const isAlreadyInProject = project.groups.some(id => id.equals(groupId));
  if (isAlreadyInProject) {
    const error = new Error('Group is already in this project');
    error.statusCode = 400;
    throw error;
  }

  project.groups.push(groupId);
  await project.save();
  return { message: 'Group added successfully' };
};
module.exports = {
  createProject,
  getAllProjects,
  updateProject,
  deleteProject,
  cloneProject,
  getProjectByKey,
  getProjectMembers,
  addMemberToProject,
  addGroupToProject
};