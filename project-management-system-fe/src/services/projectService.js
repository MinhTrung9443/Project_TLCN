import apiClient from "./apiClient";

export const getProjects = (search) => {
  const params = {};
  if (search) {
    params.search = search;
  }
  return apiClient.get("/projects", { params });
};

export const createProject = (projectData) => {
  return apiClient.post("/projects", projectData);
};

export const getArchivedProjects = (search) => {
  const params = {};
  if (search) {
    params.search = search;
  }
  return apiClient.get("/projects/archived", { params });
};

export const cloneProject = (sourceProjectId, cloneData) => {
  return apiClient.post(`/projects/${sourceProjectId}/clone`, cloneData);
};

export const getProjectByKey = (key) => {
  return apiClient.get(`/projects/key/${key}`);
};

export const restoreProject = (projectId) => {
  return apiClient.put(`/projects/${projectId}/restore`);
};

// **NEW**
export const permanentlyDeleteProject = (projectId) => {
  return apiClient.delete(`/projects/${projectId}/permanent`);
};

export const getProjectMembers = (projectKey) => {
  return apiClient.get(`/projects/key/${projectKey}/members`);
};
export const getProjectMember = (projectKey) => {
  return apiClient.get(`/projects/key/${projectKey}/members`);
};
export const addMemberToProject = (projectKey, data) => {
  return apiClient.post(`/projects/key/${projectKey}/members`, data);
};
export const addGroupToProject = (projectKey, data) => {
  return apiClient.post(`/projects/key/${projectKey}/groups`, data);
};

export const updateProjectByKey = (projectKey, projectData) => {
  return apiClient.put(`/projects/key/${projectKey}`, projectData);
};

export const archiveProjectByKey = (projectKey) => {
  return apiClient.delete(`/projects/key/${projectKey}/archive`);
};

// [SỬA] Đổi tên cho rõ nghĩa
export const addMembersFromGroupToProject = (projectKey, data) => {
  // Route mới của bạn là .../add-from-group
  return apiClient.post(`/projects/key/${projectKey}/add-from-group`, data);
};
export const removeMemberFromProject = (projectKey, userId) => {
  return apiClient.delete(`/projects/key/${projectKey}/members/${userId}`);
};

// 2. Xóa cả một team khỏi dự án
export const removeTeamFromProject = (projectKey, teamId) => {
  return apiClient.delete(`/projects/key/${projectKey}/teams/${teamId}`);
};

// 3. Thay đổi vai trò của một thành viên
export const changeMemberRole = (projectKey, userId, data) => {
  // data: { newRole: 'LEADER' | 'MEMBER' }
  return apiClient.put(`/projects/key/${projectKey}/members/${userId}/role`, data);
};

// 4. Thay đổi leader của một team
export const changeTeamLeader = (projectKey, teamId, data) => {
  // data: { newLeaderId: '...' }
  return apiClient.put(`/projects/key/${projectKey}/teams/${teamId}/leader`, data);
};
export const addMemberToTeamInProject = (projectKey, teamId, data) => {
  return apiClient.post(`/projects/key/${projectKey}/teams/${teamId}/members`, data);
};

export const removeMemberFromTeamInProject = (projectKey, teamId, userId) => {
  return apiClient.delete(`/projects/key/${projectKey}/teams/${teamId}/members/${userId}`);
};
