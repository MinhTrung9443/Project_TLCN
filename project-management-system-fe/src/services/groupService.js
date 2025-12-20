import apiClient from "./apiClient";

const getUsers = (params) => {
  return apiClient.get("/users", { params });
};

const getGroups = (params) => {
  return apiClient.get("/groups", { params });
};

const createGroup = (groupData) => {
  return apiClient.post("/groups", groupData);
};

const updateGroup = (groupId, updateData) => {
  return apiClient.put(`/groups/${groupId}`, updateData);
};

const deleteGroup = (groupId) => {
  return apiClient.delete(`/groups/${groupId}`);
};

const getGroupMembers = (groupId, params) => {
  return apiClient.get(`/groups/${groupId}/members`, { params });
};

const addMemberToGroup = (groupId, userIds) => {
  // Support both single userId and array of userIds
  const payload = Array.isArray(userIds) ? { userIds } : { userId: userIds };
  return apiClient.post(`/groups/${groupId}/members`, payload);
};

const removeMemberFromGroup = (groupId, userId) => {
  return apiClient.delete(`/groups/${groupId}/members/${userId}`);
};

const getGroupById = (groupId) => {
  return apiClient.get(`/groups/${groupId}`);
};

export const groupService = {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  addMemberToGroup,
  removeMemberFromGroup,
  getGroupById,
};

export const userService = {
  getUsers,
};
