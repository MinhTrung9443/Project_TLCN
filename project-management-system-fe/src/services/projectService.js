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

export const deleteProject = (projectId) => {
  return apiClient.delete(`/projects/${projectId}`);
};

export const cloneProject = (sourceProjectId, cloneData) => {
  return apiClient.post(`/projects/${sourceProjectId}/clone`, cloneData);
};