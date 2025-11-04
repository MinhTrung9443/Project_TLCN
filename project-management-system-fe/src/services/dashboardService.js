import apiClient from "./apiClient";

export const getDashboardOverview = () => apiClient.get("/dashboard/overview");
export const getDashboardMyTasks = (params) => apiClient.get("/dashboard/my-tasks", { params });
export const getDashboardActivity = (params) => apiClient.get("/dashboard/activity", { params });
export const getDashboardStats = () => apiClient.get("/dashboard/stats");
export const getDashboardProjects = () => apiClient.get("/dashboard/projects");
