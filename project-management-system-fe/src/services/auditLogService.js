import apiClient from "./apiClient";

export const getProjectAuditOverview = (projectId) => apiClient.get("/auditlog/overview", { params: { projectId } });

export const getProjectAuditLogs = (projectId, page = 1, limit = 20) => apiClient.get("/auditlog/logs", { params: { projectId, page, limit } });
