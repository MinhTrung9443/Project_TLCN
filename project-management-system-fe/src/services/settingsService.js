import apiClient from './apiClient';

export const getCreateTaskFormData = (projectKey) => {
  return apiClient.get(`/settings/create-task-form/${projectKey}`);
};