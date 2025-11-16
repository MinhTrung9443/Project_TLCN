import apiClient from "./apiClient";

export const getTasksByProject = (projectKey) => {
  return apiClient.get(`/tasks/project/${projectKey}`);
};

export const createTask = (taskData) => {
  return apiClient.post("/tasks", taskData);
};

export const updateTaskSprint = (taskId, sprintId) => {
  return apiClient.put(`/tasks/change-sprint/${taskId}`, { sprintId });
};

export const updateTaskStatus = (taskId, statusId) => {
  return apiClient.put(`/tasks/update-status/${taskId}`, { statusId });
};

export const searchTasks = (params) => {
  const query = new URLSearchParams(JSON.parse(JSON.stringify(params))).toString();
  return apiClient.get(`/tasks/search?${query}`);
};

export const updateTask = (taskId, updateData) => {
  return apiClient.patch(`/tasks/${taskId}`, updateData);
};
export const deleteTask = (taskId) => {
  return apiClient.delete(`/tasks/${taskId}`);
};
export const addAttachment = async (taskId, file) => {
    const formData = new FormData();
    formData.append('attachment', file); // 'attachment' phải khớp với tên field trong upload.single() ở backend

    const config = {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    };

    const response = await apiClient.post(`/tasks/${taskId}/attachments`, formData, config);
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