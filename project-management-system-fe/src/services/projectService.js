import apiClient from './apiClient'; 

export const getProjects = () => {
  return apiClient.get('/projects');
};

export const createProject = (projectData) => {
  return apiClient.post('/projects', projectData);
};

// export const updateProject = (projectId, data) => apiClient.put(`/projects/${projectId}`, data);
// export const deleteProject = (projectId) => apiClient.delete(`/projects/${projectId}`);