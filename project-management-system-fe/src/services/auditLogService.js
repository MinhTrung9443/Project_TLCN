import apiClient from "./apiClient";

export const getProjectAuditOverview = (projectId) => apiClient.get("/auditlog/overview", { params: { projectId } });

export const getProjectAuditLogs = (projectId, page = 1, limit = 20, filters = {}) => {
  const params = { projectId, page, limit };
  if (filters.userId) params.userId = filters.userId;
  if (filters.action) params.action = filters.action;
  if (filters.tableName) params.tableName = filters.tableName;
  return apiClient.get("/auditlog/logs", { params });
};
