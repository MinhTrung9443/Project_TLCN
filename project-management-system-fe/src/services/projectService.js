import apiClient from './apiClient';

export const getProjects = () => {
  return apiClient.get('/projects');
};

export const createProject = (projectData) => {
  return apiClient.post('/projects', projectData);
};

export const updateProject = (projectId, projectData) => {
  return apiClient.put(`/projects/${projectId}`, projectData);
};

export const archiveProject = (projectId) => {
  return apiClient.delete(`/projects/${projectId}`);
};

export const getArchivedProjects = () => {
  return apiClient.get('/projects/archived');
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
    return apiClient.get(`/projects/${projectKey}/members`);
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