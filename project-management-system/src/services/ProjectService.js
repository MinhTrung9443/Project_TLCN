const Project = require("../models/Project");
const TaskType = require("../models/TaskType");
const Priority = require("../models/Priority");
const Platform = require("../models/Platform");
const Workflow = require("../models/Workflow");
const Sprint = require("../models/Sprint");
const { logAction } = require("./AuditLogHelper");
const notificationService = require("./NotificationService");
const Group = require("../models/Group");

const copyDefaultSettingsForProject = async (projectId) => {
  const findDefaultTaskTypes = TaskType.find({ projectId: null });
  const findDefaultPriorities = Priority.find({ projectId: null });
  const findDefaultPlatforms = Platform.find({ projectId: null });
  const findDefaultWorkflows = Workflow.find({ isDefault: true });

  const [defaultTaskTypes, defaultPriorities, defaultPlatforms, defaultWorkflows] = await Promise.all([
    findDefaultTaskTypes,
    findDefaultPriorities,
    findDefaultPlatforms,
    findDefaultWorkflows,
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

  const newWorkflows = defaultWorkflows.map((item) => {
    const newItem = item.toObject();
    delete newItem._id;
    newItem.projectId = projectId;
    newItem.isDefault = false;
    newItem.name = "Workflow of " + projectId;
    newItem.description = "Workflow of " + projectId;
    return newItem;
  });

  const insertTaskTypes = newTaskTypes.length > 0 ? TaskType.insertMany(newTaskTypes) : Promise.resolve();
  const insertPriorities = newPriorities.length > 0 ? Priority.insertMany(newPriorities) : Promise.resolve();
  const insertPlatforms = newPlatforms.length > 0 ? Platform.insertMany(newPlatforms) : Promise.resolve();
  const insertWorkflows = newWorkflows.length > 0 ? Workflow.insertMany(newWorkflows) : Promise.resolve();

  await Promise.all([insertTaskTypes, insertPriorities, insertPlatforms, insertWorkflows]);
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
  const { key, projectManagerId } = projectData;

  // Kiểm tra bắt buộc phải có PM khi tạo dự án
  if (!projectManagerId) {
    const error = new Error("Project Manager is required to create a project.");
    error.statusCode = 400;
    throw error;
  }

  const projectExists = await Project.findOne({ key: key.toUpperCase() });
  if (projectExists) {
    const error = new Error("Project key already exists");
    error.statusCode = 400;
    throw error;
  }

  const newProject = new Project({
    ...projectData,
    members: [{ userId: projectManagerId, role: "PROJECT_MANAGER" }],
  });
  const savedProject = await newProject.save();

  try {
    await copyDefaultSettingsForProject(savedProject._id);
  } catch (copyError) {
    console.error(`Failed to copy default settings for project ${savedProject._id}:`, copyError);
  }

  // Tự động tạo Kanban Board sprint cho project Kanban
  if (savedProject.type === "Kanban") {
    try {
      const kanbanSprint = new Sprint({
        name: "Kanban Board",
        description: "Default Kanban board for this project",
        projectId: savedProject._id,
        status: "Started",
        startDate: new Date(),
      });
      await kanbanSprint.save();
      console.log(`✅ Created Kanban Board sprint for project ${savedProject.key}`);
    } catch (sprintError) {
      console.error(`Failed to create Kanban Board sprint for project ${savedProject._id}:`, sprintError);
    }
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

const getAllProjects = async (userId) => {
  // Tìm các dự án mà trong mảng 'members' có chứa userId hiện tại
  const projects = await Project.find({ "members.userId": userId, isDeleted: false })
    .populate("members.userId", "fullname email avatar")
    .sort({ createdAt: -1 });
    return projects;
};
const getArchivedProjects = async () => {
  const projects = await Project.find({ isDeleted: true })
    .populate("members.userId", "fullname email avatar") // Populate tất cả members
    .sort({ deletedAt: -1 });
  return projects;
};


const updateProjectByKey = async (projectKey, projectData, userId) => {
    const project = await Project.findOne({ key: projectKey.toUpperCase() });
    if (!project) {
        const error = new Error("Project not found");
        error.statusCode = 404;
        throw error;
    }

     if (projectData.key && projectData.key.toUpperCase() !== projectKey.toUpperCase()) {
        const newKey = projectData.key.toUpperCase();
        const keyExists = await Project.findOne({ key: newKey });
        if (keyExists) {
            const error = new Error("New project key already exists");
            error.statusCode = 400;
            throw error;
        }
    }

    const oldProject = project.toObject(); 
    
    Object.assign(project, projectData);
    
    const updatedProject = await project.save();

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
const archiveProjectByKey = async (projectKey, userId) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  const oldProject = project.toObject();
  project.isDeleted = true;
  project.deletedAt = new Date();
  await project.save();

  await logAction({
    userId,
    action: "archive_project",
    tableName: "Project",
    recordId: project._id,
    oldData: oldProject,
    newData: project,
  });

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

const cloneProject = async (sourceProjectId, cloneData, userId) => {
  const { name, key, projectManagerId } = cloneData;

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
    members: [{ userId: projectManagerId, role: "PROJECT_MANAGER" }],
    // Reset các trạng thái
    status: "active",
    isDeleted: false,
    deletedAt: null,
  };

  const clonedProject = new Project(newProjectData);
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
  const project = await Project.findOne({ key: key.toUpperCase(), isDeleted: false })
    .populate("members.userId", "fullname email avatar");
  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  return project;
};

const getProjectMembers = async (projectKey) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase(), isDeleted: false })
    .populate("members.userId", "fullname email avatar");

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }
  
  // Chỉ trả về mảng members
  return project.members || [];
};

const addMemberToProject = async (projectKey, { userId, role }, actor) => {
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

    try {
        await notificationService.notifyProjectMemberAdded({
            projectId: project._id,
            projectName: project.name,
            newMemberId: userId,
            addedByName: actor.fullname, // Dùng tên của người thêm
            role: role,
        });
    } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
    }
    return { message: "Member added successfully" };
};

const addMembersFromGroupToProject = async (projectKey, { groupId, role }, actor) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }
  const group = await Group.findById(groupId);
  if (!group) { 
    const error = new Error("Group not found");
    error.statusCode = 404;
    throw error;
  }
  
  const memberIdsInGroup = group.members;
  const existingMemberIds = new Set(project.members.map(m => m.userId.toString()));
  
  let addedCount = 0;
  const membersToAdd = [];

  for (const memberId of memberIdsInGroup) {
    if (!existingMemberIds.has(memberId.toString())) {
      membersToAdd.push({ userId: memberId, role: role });
      addedCount++;
    }
  }

  if (addedCount > 0) {
    project.members.push(...membersToAdd);
    await project.save();
    // (Optional) Gửi thông báo cho từng người được thêm
  }
  
  return { message: `Successfully added ${addedCount} new members from the group.` };
};

module.exports = {
  createProject,
  getAllProjects,
  getArchivedProjects,
  updateProjectByKey,
  archiveProjectByKey, 
  restoreProject,
  permanentlyDeleteProject,
  cloneProject,
  getProjectByKey,
  getProjectMembers,
  addMemberToProject,
  addMembersFromGroupToProject,
};
