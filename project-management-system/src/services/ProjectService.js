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
const getAllProjects = async (actor, search) => {
  // 1. Thêm tham số 'search'
  let query = { isDeleted: false };

  if (actor.role !== "admin") {
    query["members.userId"] = actor._id;
  }

  // 2. Thêm logic tìm kiếm nếu có tham số 'search'
  if (search) {
    const searchRegex = new RegExp(search, "i"); // 'i' để tìm kiếm không phân biệt hoa thường
    query.$or = [{ name: { $regex: searchRegex } }, { key: { $regex: searchRegex } }];
  }

  const projects = await Project.find(query)
    .populate({
      path: "members.userId",
      select: "fullname email avatar",
    })
    .sort({ createdAt: -1 })
    .lean();

  const projectsWithPM = projects.map((project) => {
    const pm = project.members.find((m) => m.role === "PROJECT_MANAGER");
    return {
      ...project,
      projectManager: pm ? pm.userId : null,
    };
  });

  return projectsWithPM;
};

const getArchivedProjects = async (search) => {
  let query = { isDeleted: true };

  // Thêm điều kiện tìm kiếm theo name hoặc key nếu có
  if (search) {
    query.$or = [{ name: { $regex: search, $options: "i" } }, { key: { $regex: search, $options: "i" } }];
  }

  const projects = await Project.find(query)
    .populate({
      path: "members.userId",
      select: "fullname email avatar",
    })
    .sort({ deletedAt: -1 })
    .lean();

  const projectsWithPM = projects.map((project) => {
    const pm = project.members.find((m) => m.role === "PROJECT_MANAGER");
    return {
      ...project,
      projectManager: pm ? pm.userId : null,
    };
  });

  return projectsWithPM;
};

const updateProjectByKey = async (projectKey, projectData, userId) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  const oldProject = project.toObject();

  const newManagerId = projectData.projectManagerId;
  if (newManagerId) {
    const currentManagerIndex = project.members.findIndex((m) => m.role === "PROJECT_MANAGER");
    const currentManager = currentManagerIndex > -1 ? project.members[currentManagerIndex] : null;

    if (currentManager && currentManager.userId.toString() !== newManagerId) {
      project.members[currentManagerIndex].role = "MEMBER";

      const newManagerIndex = project.members.findIndex((m) => m.userId.toString() === newManagerId);
      if (newManagerIndex > -1) {
        project.members[newManagerIndex].role = "PROJECT_MANAGER";
      } else {
        project.members.push({ userId: newManagerId, role: "PROJECT_MANAGER" });
      }
    }
  }

  project.name = projectData.name;
  project.key = projectData.key;
  project.type = projectData.type;
  project.description = projectData.description;
  project.startDate = projectData.startDate;
  project.endDate = projectData.endDate;
  if (projectData.status) {
    project.status = projectData.status;
  }

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
  const deletedProject = await Project.findByIdAndDelete(projectId);

  if (!deletedProject) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

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

  delete sourceProject._id;
  delete sourceProject.createdAt;
  delete sourceProject.updatedAt;
  delete sourceProject.__v;
  delete sourceProject.members;
  delete sourceProject.groups;

  const newProjectData = {
    ...sourceProject,
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
      path: "members.userId",
      select: "fullname email avatar",
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
    .populate("teams.teamId", "name") // Populate để lấy tên group
    .populate("teams.leaderId", "fullname email avatar") // Lấy thông tin của leader
    .populate("teams.members", "fullname email avatar"); // Populate members đã được add vào team trong project

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    members: project.members || [],
    teams: project.teams || [],
  };
};

const addMemberToProject = async (projectKey, { userId, role, teamId }, actor) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra xem user đã là member chưa (kiểm tra cả trong members và teams)
  const isAlreadyInMembers = project.members.some((member) => member.userId.equals(userId));
  const isAlreadyInTeams = project.teams.some((team) => team.members.some((m) => m.equals(userId)));

  if (isAlreadyInMembers || isAlreadyInTeams) {
    const error = new Error("User is already a member of this project");
    error.statusCode = 400;
    throw error;
  }

  // Nếu có teamId, thêm user vào team (ĐỂU KHÔNG thêm vào project.members)
  if (teamId) {
    // Kiểm tra xem team đã có trong project chưa
    let team = project.teams.find((t) => t.teamId.equals(teamId));

    if (team) {
      // Team đã có trong project

      // Nếu user được thêm với role LEADER, cập nhật leaderId của team
      if (role === "LEADER") {
        team.leaderId = userId;
        // Nếu user đang nằm trong members, xóa khỏi members (vì giờ là leader rồi)
        team.members = team.members.filter((m) => !m.equals(userId));
      } else {
        // Nếu role là MEMBER, thêm vào members (nếu chưa có)
        if (!team.members.some((m) => m.equals(userId))) {
          team.members.push(userId);
        }
      }
    } else {
      // Team chưa có trong project, tạo team mới
      // User này sẽ làm leader của team mới
      project.teams.push({
        teamId: teamId,
        leaderId: userId, // User làm leader
        members: [], // Members rỗng, leader KHÔNG nằm trong members
      });
    }
  } else {
    // Nếu KHÔNG có teamId, thêm vào project.members (user không thuộc team nào)
    project.members.push({ userId, role });
  }

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
  const { groupId, leaderId, memberIds } = data;
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) throw new Error("Project not found");

  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");

  const teamExists = project.teams.some((t) => t.teamId.equals(groupId));
  if (teamExists) throw new Error("This team is already in the project.");

  // Thêm team vào project (KHÔNG thêm members vào project.members)
  // Leader KHÔNG nằm trong members array
  const membersWithoutLeader = memberIds.filter((id) => id.toString() !== leaderId.toString());

  project.teams.push({
    teamId: groupId,
    leaderId: leaderId,
    members: membersWithoutLeader, // Chỉ lưu members, không bao gồm leader
  });

  await project.save();
  await logAction({ userId: actor._id, action: "add_team_to_project" /* ... */ });
  return project;
};

const removeMemberFromProject = async (projectKey, userIdToRemove) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) {
    throw new Error("Project not found");
  }

  // Kiểm tra user có tồn tại trong project không (kiểm tra cả members array và teams)
  const memberToRemove = project.members.find((m) => m.userId.equals(userIdToRemove));
  const isInTeams = project.teams.some((t) => t.leaderId.equals(userIdToRemove) || t.members.some((m) => m.equals(userIdToRemove)));

  if (!memberToRemove && !isInTeams) {
    throw new Error("Member not found in this project.");
  }

  // Kiểm tra nếu user là PM trong members array
  if (memberToRemove && memberToRemove.role === "PROJECT_MANAGER") {
    const pmCount = project.members.filter((m) => m.role === "PROJECT_MANAGER").length;
    if (pmCount <= 1) {
      throw new Error("Cannot remove the only Project Manager from the project.");
    }
  }

  // Kiểm tra nếu user đang là leader của team nào
  const isLeadingTeam = project.teams.some((t) => t.leaderId.equals(userIdToRemove));
  if (isLeadingTeam) {
    throw new Error("Cannot remove user. They are currently leading a team. Please change the team leader first.");
  }

  // Xóa user khỏi members array (nếu có)
  project.members = project.members.filter((m) => !m.userId.equals(userIdToRemove));

  // Xóa user khỏi tất cả teams (nếu có)
  project.teams.forEach((team) => {
    team.members = team.members.filter((m) => !m.equals(userIdToRemove));
  });

  await project.save();
  return project; // Trả về project đã cập nhật
};

const removeTeamFromProject = async (projectKey, teamIdToRemove) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() }).populate("teams.teamId");
  if (!project) {
    throw new Error("Project not found");
  }

  const teamRelationToRemove = project.teams.find((t) => t.teamId._id.equals(teamIdToRemove));
  if (!teamRelationToRemove) {
    throw new Error("Team not found in this project.");
  }

  const memberIdsInTeamToRemove = teamRelationToRemove.teamId.members.map((id) => id.toString());

  const pmsInTeam = project.members.filter(
    (member) => member.role === "PROJECT_MANAGER" && memberIdsInTeamToRemove.includes(member.userId.toString())
  );

  const totalPMsInProject = project.members.filter((m) => m.role === "PROJECT_MANAGER").length;

  if (pmsInTeam.length > 0 && pmsInTeam.length >= totalPMsInProject) {
    throw new Error(
      "Cannot remove this team. Doing so would remove the only Project Manager(s) from the project. Please assign a new Project Manager first."
    );
  }

  project.teams = project.teams.filter((t) => !t.teamId._id.equals(teamIdToRemove));

  project.members = project.members.filter((m) => !memberIdsInTeamToRemove.includes(m.userId.toString()));

  await project.save();
  return project;
};

const changeMemberRole = async (projectKey, userId, newRole) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) throw new Error("Project not found");

  // Tìm user trong teams (có thể là leader hoặc member)
  const userTeam = project.teams.find((t) => t.leaderId.equals(userId) || t.members.some((m) => m.equals(userId)));

  // Tìm user trong members array (individual members)
  const memberIndex = project.members.findIndex((m) => m.userId.equals(userId));

  // Kiểm tra user có tồn tại trong project không
  if (!userTeam && memberIndex === -1) {
    throw new Error("Member not found in this project.");
  }

  // Nếu có trong members array, kiểm tra PM
  if (memberIndex > -1) {
    const memberToChange = project.members[memberIndex];
    if (memberToChange.role === "PROJECT_MANAGER" && newRole !== "PROJECT_MANAGER") {
      const pmCount = project.members.filter((m) => m.role === "PROJECT_MANAGER").length;
      if (pmCount <= 1) {
        throw new Error("Cannot change the role of the only Project Manager.");
      }
    }
  }

  // Xử lý thay đổi role trong team
  if (userTeam) {
    if (newRole === "LEADER") {
      // Set as LEADER: Chuyển user thành leader, leader cũ thành member
      const oldLeaderId = userTeam.leaderId;

      // Set leader mới
      userTeam.leaderId = userId;

      // Xóa user mới khỏi members array (leader không nằm trong members)
      userTeam.members = userTeam.members.filter((m) => !m.equals(userId));

      // Thêm leader cũ vào members array (nếu không phải là leader của team khác)
      const isOldLeaderStillLeading = project.teams.some((t) => t.teamId.toString() !== userTeam.teamId.toString() && t.leaderId.equals(oldLeaderId));
      if (!isOldLeaderStillLeading && !userTeam.members.some((m) => m.equals(oldLeaderId))) {
        userTeam.members.push(oldLeaderId);
      }

      // Cập nhật role trong members array nếu có
      const oldLeaderIndex = project.members.findIndex((m) => m.userId.equals(oldLeaderId));
      if (oldLeaderIndex > -1 && project.members[oldLeaderIndex].role !== "PROJECT_MANAGER") {
        project.members[oldLeaderIndex].role = "MEMBER";
      }
    } else if (newRole === "MEMBER") {
      // Set as MEMBER: Nếu đang là leader, chuyển thành member
      if (userTeam.leaderId.equals(userId)) {
        throw new Error("Cannot change leader to member. Please assign a new leader first.");
      }
      // Nếu đã là member trong team, không cần làm gì (role đã đúng)
    }
  }

  // Cập nhật role trong members array (nếu user là individual member)
  if (memberIndex > -1) {
    project.members[memberIndex].role = newRole;
  }

  await project.save();
  return project;
};
const changeTeamLeader = async (projectKey, teamId, newLeaderId) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) {
    throw new Error("Project not found");
  }

  const teamIndex = project.teams.findIndex((t) => t.teamId.equals(teamId));
  if (teamIndex === -1) {
    throw new Error("Team not found in this project.");
  }

  const oldLeaderId = project.teams[teamIndex].leaderId;

  project.teams[teamIndex].leaderId = newLeaderId;

  const isOldLeaderStillLeading = project.teams.some((t) => t.leaderId.equals(oldLeaderId));
  const oldLeaderMemberIndex = project.members.findIndex((m) => m.userId.equals(oldLeaderId));
  if (oldLeaderMemberIndex > -1 && !isOldLeaderStillLeading && project.members[oldLeaderMemberIndex].role !== "PROJECT_MANAGER") {
    project.members[oldLeaderMemberIndex].role = "MEMBER";
  }

  const newLeaderMemberIndex = project.members.findIndex((m) => m.userId.equals(newLeaderId));
  if (newLeaderMemberIndex > -1) {
    project.members[newLeaderMemberIndex].role = "LEADER";
  } else {
    project.members.push({ userId: newLeaderId, role: "LEADER" });
  }

  await project.save();
  return project;
};
const addMemberToTeamInProject = async (projectKey, teamId, userIdToAdd) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) throw new Error("Project not found");

  const teamIndex = project.teams.findIndex((t) => t.teamId.equals(teamId));
  if (teamIndex === -1) throw new Error("Team not found in project.");

  project.teams[teamIndex].members.addToSet(userIdToAdd);

  const isAlreadyMember = project.members.some((m) => m.userId.equals(userIdToAdd));
  if (!isAlreadyMember) {
    project.members.push({ userId: userIdToAdd, role: "MEMBER" });
  }

  await project.save();
  return project;
};

const removeMemberFromTeamInProject = async (projectKey, teamId, userIdToRemove) => {
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  if (!project) throw new Error("Project not found");

  const team = project.teams.find((t) => t.groupId.equals(teamId));
  if (teamIndex === -1) throw new Error("Team not found in project.");

  if (project.teams[teamIndex].leaderId.equals(userIdToRemove)) {
    throw new Error("Cannot remove the team leader. Please change the leader first.");
  }

  project.teams[teamIndex].members.pull(userIdToRemove);

  await project.save();
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
  removeMemberFromProject,
  removeTeamFromProject,
  changeMemberRole,
  changeTeamLeader,
  addMemberToTeamInProject,
  removeMemberFromTeamInProject,
};
