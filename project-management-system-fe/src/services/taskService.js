import apiClient from './apiClient';

export const getTasksByProject = (projectKey) => {
  return apiClient.get(`/tasks/project/${projectKey}`);
};

export const createTask = (taskData) => {
  return apiClient.post('/tasks', taskData);
};
