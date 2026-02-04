import apiClient from "./apiClient";

export const getProjectDocuments = (projectKey, source = "all") => {
  return apiClient.get(`/projects/key/${projectKey}/documents`, { params: { source } });
};

export const uploadProjectDocument = (projectKey, file, metadata = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  if (metadata.category) formData.append("category", metadata.category);
  if (metadata.version) formData.append("version", metadata.version);
  if (metadata.tags) formData.append("tags", metadata.tags);

  return apiClient.post(`/projects/key/${projectKey}/documents`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const getProjectMembers = (projectKey) => {
  return apiClient.get(`/projects/key/${projectKey}/members`);
};

export const shareProjectDocument = (projectKey, documentId, emails) => {
  return apiClient.put(`/projects/key/${projectKey}/documents/${documentId}/share`, { emails });
};

export const deleteProjectDocument = (projectKey, documentId) => {
  return apiClient.delete(`/projects/key/${projectKey}/documents/${documentId}`);
};
