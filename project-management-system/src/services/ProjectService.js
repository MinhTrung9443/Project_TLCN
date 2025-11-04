const Project = require("../models/Project");
const TaskType = require("../models/TaskType");
const Priority = require("../models/Priority");
const Platform = require("../models/Platform");
const { logAction } = require("./AuditLogHelper");

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

  const [sourceTaskTypes, sourcePriorities, sourcePlatforms] = await Promise.all([findSourceTaskTypes, findSourcePriorities, findSourcePlatforms]);

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

const createProject = async (projectData, userId) => {
  const { key, projectLeaderId } = projectData;

  const projectExists = await Project.findOne({ key: key.toUpperCase() });
  if (projectExists) {
    const error = new Error("Project key already exists");
    error.statusCode = 400;
    throw error;
  }

  const newProject = new Project({
    ...projectData,
    members: [{ userId: projectLeaderId, role: "Project Manager" }],
  });

  const savedProject = await newProject.save();

  try {
    await copyDefaultSettingsForProject(savedProject._id);
  } catch (copyError) {
    console.error(`Failed to copy default settings for project ${savedProject._id}:`, copyError);
  }

  await logAction({
    userId,
    action: "create_project",
    tableName: "Project",
    recordId: savedProject._id,
    newData: savedProject,
  });

  return savedProject;
};

const getAllProjects = async () => {
  // Lấy các dự án đang hoạt động (chưa bị xóa mềm)
  const projects = await Project.find({ isDeleted: false }).populate("projectLeaderId", "fullname email avatar").sort({ createdAt: -1 });
  return projects;
};
const getArchivedProjects = async () => {
  const projects = await Project.find({ isDeleted: true }).populate("projectLeaderId", "fullname email avatar").sort({ deletedAt: -1 }); // Sắp xếp theo ngày lưu trữ
  return projects;
};

const updateProject = async (projectId, projectData, userId) => {
  const { key } = projectData;

  if (key) {
    const projectExists = await Project.findOne({
      key: key.toUpperCase(),
      _id: { $ne: projectId },
    });
    if (projectExists) {
      const error = new Error("Project key already exists");
      error.statusCode = 400;
      throw error;
    }
  }

  const oldProject = await Project.findById(projectId).lean();
  const updatedProject = await Project.findByIdAndUpdate(projectId, projectData, { new: true });

  if (!updatedProject) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  await logAction({
    userId,
    action: "update_project",
    tableName: "Project",
    recordId: updatedProject._id,
    oldData: oldProject,
    newData: updatedProject,
  });

  return updatedProject;
};

const archiveProject = async (projectId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  project.isDeleted = true;
  project.deletedAt = new Date();
  await project.save();

  return { message: "Project archived successfully" };
};

const restoreProject = async (projectId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  project.isDeleted = false;
  project.deletedAt = null;
  await project.save();

  return { message: "Project restored successfully" };
};

const permanentlyDeleteProject = async (projectId, userId) => {
  // Xóa dự án
  const deletedProject = await Project.findByIdAndDelete(projectId);

  if (!deletedProject) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  // Xóa tất cả các cài đặt liên quan (quan trọng để giữ DB sạch)
  await Promise.all([TaskType.deleteMany({ projectId }), Priority.deleteMany({ projectId }), Platform.deleteMany({ projectId })]);

  await logAction({
    userId,
    action: "delete_project",
    tableName: "Project",
    recordId: deletedProject._id,
    oldData: deletedProject,
  });

  return { message: "Project permanently deleted successfully" };
};

const cloneProject = async (sourceProjectId, cloneData) => {
  const { name, key, projectLeaderId } = cloneData;

  const keyExists = await Project.findOne({ key: key.toUpperCase() });
  if (keyExists) {
    const error = new Error("New project key already exists");
    error.statusCode = 400;
    throw error;
  }

  const sourceProject = await Project.findById(sourceProjectId).lean();
  if (!sourceProject) {
    const error = new Error("Source project not found");
    error.statusCode = 404;
    throw error;
  }

  // Xóa các trường không nên sao chép
  delete sourceProject._id;
  delete sourceProject.createdAt;
  delete sourceProject.updatedAt;
  delete sourceProject.__v;
  // Quan trọng: Xóa mảng members và groups cũ để khởi tạo lại
  delete sourceProject.members;
  delete sourceProject.groups;

  const newProjectData = {
    ...sourceProject,
    // Ghi đè các thông tin mới
    name,
    key,
    projectLeaderId,
    // Khởi tạo lại mảng members với chỉ Project Leader
    members: [{ userId: projectLeaderId, role: "Project Manager" }],
    // Khởi tạo mảng groups rỗng
    groups: [],
    // Reset các trạng thái
    status: "active",
    isDeleted: false,
    deletedAt: null,
  };

  const clonedProject = new Project(newProjectData);
  // Dòng này sẽ không còn báo lỗi validation nữa
  await clonedProject.save();

  // Bây giờ mới sao chép các setting khác (TaskType, Priority...)
  try {
    await copySettingsFromSourceProject(sourceProjectId, clonedProject._id);
  } catch (copyError) {
    console.error(`Failed to copy settings for cloned project ${clonedProject._id}:`, copyError);
  }

  return clonedProject;
};
const getProjectByKey = async (key) => {
  const project = await Project.findOne({ key: key.toUpperCase(), isDeleted: false }).populate("projectLeaderId", "fullname email avatar");
  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  return project;
};

const getProjectMembers = async (projectKey) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase(), isDeleted: false })
    .populate({
      path: "members.userId",
      select: "fullname email avatar",
    })
    .populate({
      path: "groups.groupId",
      select: "name members",
      model: "Group",
    });

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  // Luôn trả về cấu trúc này, ngay cả khi mảng rỗng
  return {
    members: project.members || [],
    groups: project.groups || [],
  };
};
const addMemberToProject = async (projectKey, { userId, role }) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  // Logic kiểm tra này đã đúng, `member.userId` là một ObjectId
  const isAlreadyMember = project.members.some((member) => member.userId.equals(userId));
  if (isAlreadyMember) {
    const error = new Error("User is already a member of this project");
    error.statusCode = 400;
    throw error;
  }

  project.members.push({ userId, role });
  await project.save();
  return { message: "Member added successfully" };
};

const addGroupToProject = async (projectKey, { groupId, role }) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }
  const isAlreadyInProject = project.groups.some((g) => g.groupId && g.groupId.equals(groupId));

  if (isAlreadyInProject) {
    const error = new Error("Group is already in this project");
    error.statusCode = 400;
    throw error;
  }

  project.groups.push({ groupId, role });
  await project.save();
  return { message: "Group added successfully" };
};

module.exports = {
  createProject,
  getAllProjects,
  updateProject,
  getArchivedProjects,
  updateProject,
  archiveProject,
  restoreProject,
  permanentlyDeleteProject,
  cloneProject,
  getProjectByKey,
  getProjectMembers,
  addMemberToProject,
  addGroupToProject,
};
