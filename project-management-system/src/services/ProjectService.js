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
const getAllProjects = async (actor) => { // 'actor' là req.user
  let query = { isDeleted: false };

  // [LOGIC QUAN TRỌNG]
  // Nếu người dùng không phải là Admin, mới áp dụng bộ lọc
  if (actor.role !== 'admin') {
    query["members.userId"] = actor._id;
  }
  // Nếu là Admin, query sẽ chỉ là { isDeleted: false }, lấy tất cả

  const projects = await Project.find(query)
    .populate({
        path: 'members.userId',
        select: 'fullname email avatar'
    })
    .sort({ createdAt: -1 })
    .lean();

  const projectsWithPM = projects.map(project => {
      const pm = project.members.find(m => m.role === 'PROJECT_MANAGER');
      return {
          ...project,
          projectManager: pm ? pm.userId : null 
      };
  });

  return projectsWithPM;
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

    const oldProject = project.toObject(); // Lưu lại trạng thái cũ để ghi log

    // --- LOGIC MỚI ĐỂ XỬ LÝ THAY ĐỔI PROJECT MANAGER ---
    const newManagerId = projectData.projectManagerId;
    if (newManagerId) {
        // Tìm PM hiện tại trong mảng members
        const currentManagerIndex = project.members.findIndex(m => m.role === 'PROJECT_MANAGER');
        const currentManager = currentManagerIndex > -1 ? project.members[currentManagerIndex] : null;

        // Nếu có sự thay đổi PM
        if (currentManager && currentManager.userId.toString() !== newManagerId) {
            // 1. Hạ cấp PM cũ thành Member
            project.members[currentManagerIndex].role = 'MEMBER';

            // 2. Nâng cấp người mới thành PM
            const newManagerIndex = project.members.findIndex(m => m.userId.toString() === newManagerId);
            if (newManagerIndex > -1) {
                // Nếu người mới đã là thành viên, chỉ cần nâng cấp vai trò
                project.members[newManagerIndex].role = 'PROJECT_MANAGER';
            } else {
                // Nếu người mới chưa phải là thành viên, thêm họ vào với vai trò PM
                // (Trường hợp này ít xảy ra nếu dropdown chỉ hiển thị thành viên hiện tại)
                project.members.push({ userId: newManagerId, role: 'PROJECT_MANAGER' });
            }
        }
    }
    // --- KẾT THÚC LOGIC MỚI ---

    // Cập nhật các trường thông thường khác
    project.name = projectData.name;
    project.key = projectData.key;
    project.type = projectData.type;
    project.description = projectData.description;
    project.startDate = projectData.startDate;
    project.endDate = projectData.endDate;
    
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
    // Populate lồng: Lấy thông tin user bên trong mảng 'members'
    .populate({
        path: 'members.userId',
        select: 'fullname email avatar'
    });
    
  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }
  return project;
};


const getProjectMembers = async (projectKey) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase(), isDeleted: false })
    .populate("members.userId", "fullname email avatar")
    .populate("teams.teamId", "name members") // Lấy tên team và ds ID members của nó
    .populate("teams.leaderId", "fullname email avatar"); // Lấy thông tin của leader

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }
  
  return {
      members: project.members || [],
      teams: project.teams || []
  };
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

const addMembersFromGroupToProject = async (projectKey, data, actor) => {
  // LẤY CÁC BIẾN RA TỪ OBJECT 'data' NGAY TỪ ĐẦU
  const { groupId, leaderId, roleForOthers } = data;

  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) { 
      const error = new Error("Project not found");
      error.statusCode = 404;
      throw error;
  }

  const group = await Group.findById(groupId).populate('members');
  if (!group) { 
      const error = new Error("Group not found");
      error.statusCode = 404;
      throw error;
  }

  // 1. Thêm cấu trúc team vào dự án
  const teamExists = project.teams.some(t => t.teamId.equals(groupId));
  if (teamExists) {
      throw new Error("This team is already in the project.");
  }
  // Bây giờ biến 'leaderId' đã tồn tại và có thể sử dụng
  project.teams.push({ teamId: groupId, leaderId: leaderId });

  // 2. Thêm các thành viên vào mảng 'members' của dự án
  const existingMemberIds = new Set(project.members.map(m => m.userId.toString()));

  // Thêm Leader
  if (!existingMemberIds.has(leaderId.toString())) {
      project.members.push({ userId: leaderId, role: 'LEADER' });
  } else {
      const memberIndex = project.members.findIndex(m => m.userId.equals(leaderId));
      if (memberIndex > -1) {
        project.members[memberIndex].role = 'LEADER';
      }
  }

  // Thêm các thành viên còn lại
  for (const member of group.members) {
      const memberId = member._id.toString();
      if (!existingMemberIds.has(memberId) && memberId !== leaderId.toString()) {
          project.members.push({ userId: memberId, role: roleForOthers });
      }
  }

  await project.save();
  
  await logAction({ userId: actor._id, action: 'add_team_to_project', recordId: project._id, newData: { team: group.name } });

  return project;
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
