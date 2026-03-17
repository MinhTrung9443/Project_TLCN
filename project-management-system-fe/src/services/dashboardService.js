import apiClient from "./apiClient";

export const getDashboardOverview = (config = {}) => apiClient.get("/dashboard/overview", config);
export const getDashboardMyTasks = (params = {}, config = {}) => apiClient.get("/dashboard/my-tasks", { params, ...config });
export const getDashboardActivity = (params) => apiClient.get("/dashboard/activity", { params });
export const getDashboardStats = () => apiClient.get("/dashboard/stats");
export const getDashboardProjects = () => apiClient.get("/dashboard/projects");
