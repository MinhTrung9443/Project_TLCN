import apiClient from "./apiClient";

export const getTasksByProject = (projectKey) => {
  return apiClient.get(`/tasks/project/${projectKey}`);
};

export const createTask = (projectKey, taskData) => {
  return apiClient.post(`/tasks/project/${projectKey}`, taskData);
};

export const updateTaskSprint = (projectKey, taskId, sprintId) => {
  return apiClient.put(`/tasks/project/${projectKey}/tasks/${taskId}/change-sprint`, { sprintId });
};
export const getAllowedStatuses = (taskId) => {
  return apiClient.get(`/tasks/${taskId}/available-statuses`);
};
export const updateTaskStatus = (projectKey, taskId, statusId) => {
  return apiClient.put(`/tasks/project/${projectKey}/tasks/${taskId}/update-status`, { statusId });
};

export const updateTask = (projectKey, taskId, updateData) => {
  return apiClient.patch(`/tasks/project/${projectKey}/tasks/${taskId}`, updateData);
};

export const deleteTask = (projectKey, taskId) => {
  return apiClient.delete(`/tasks/project/${projectKey}/tasks/${taskId}`);
};
export const searchTasks = (params) => {
  const query = new URLSearchParams(JSON.parse(JSON.stringify(params))).toString();
  return apiClient.get(`/tasks/search?${query}`);
};

export const addAttachment = async (taskId, file) => {
  const formData = new FormData();
  formData.append("attachmentFile", file); // 'attachment' phải khớp với tên field trong upload.single() ở backend

  const config = {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };

  const response = await apiClient.post(`/tasks/${taskId}/attachments`, formData, config);
  return response.data;
};
export const addAttachmentFromDocument = async (taskId, documentIds) => {
  const response = await apiClient.post(`/tasks/${taskId}/attachments/from-doc`, { documentIds });
  return response.data;
};
export const deleteAttachment = async (taskId, attachmentId) => {
  const response = await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
  return response.data;
};
export const linkTask = async (taskId, targetTaskId, linkType) => {
  const response = await apiClient.post(`/tasks/${taskId}/links`, { targetTaskId, linkType });
  return response.data;
};

export const unlinkTask = async (taskId, linkId) => {
  const response = await apiClient.delete(`/tasks/${taskId}/links/${linkId}`);
  return response.data;
};
export const getTaskByKey = (taskKey) => {
  return apiClient.get(`/tasks/key/${taskKey}`);
};
