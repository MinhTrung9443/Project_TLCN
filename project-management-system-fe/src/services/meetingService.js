import apiClient from "./apiClient";

/**
 * Fetches meetings for a specific project.
 * @param {string} projectId - The ID of the project.
 * @param {string|null} status - Optional status to filter by (e.g., 'pending', 'accepted').
 * @param {string|null} teamId - Optional team ID to filter by (for PMs).
 * @param {string|null} memberId - Optional member ID to filter by (for PMs).
 * @returns {Promise}
 */
export const getMeetings = (projectId, status, teamId, memberId) => {
  const params = { projectId };
  if (status) params.status = status;
  if (teamId) params.teamId = teamId;
  if (memberId) params.memberId = memberId;

  return apiClient.get("/meetings", { params });
};

/**
 * Fetches meetings managed by the current user.
 * - Admin: all meetings in the project
 * - PM: all meetings in the project
 * - Team Leader: meetings of teams they lead
 * @param {string} projectId - The ID of the project.
 * @returns {Promise}
 */
export const getManagedMeetings = (projectId) => {
  return apiClient.get("/meetings/managed", { params: { projectId } });
};

/**
 * Fetches all meetings the current user is invited to across all projects.
 * @returns {Promise}
 */
export const getMySchedule = () => {
  return apiClient.get("/meetings/my-schedule");
};

/**
 * Responds to a meeting invitation.
 * @param {string} meetingId - The ID of the meeting.
 * @param {'accepted' | 'declined'} status - The user's response.
 * @param {string} [reason] - An optional reason for declining.
 * @returns {Promise}
 */
export const rsvpToMeeting = (meetingId, status, reason) => {
  const payload = { status, reason }; // Backend needs to handle the 'reason' field if desired
  return apiClient.post(`/meetings/${meetingId}/rsvp`, payload);
};

// You can add other service functions here as needed, e.g.:
export const createMeeting = (meetingData) => apiClient.post("/meetings", meetingData);
export const updateMeeting = (meetingId, updateData) => apiClient.put(`/meetings/${meetingId}`, updateData);
export const deleteMeeting = (meetingId) => apiClient.delete(`/meetings/${meetingId}`);

/**
 * Join a meeting and get LiveKit token
 * @param {string} meetingId - The ID of the meeting
 * @returns {Promise} Response with token, roomName, serverUrl, isHost
 */
export const joinMeeting = (meetingId) => apiClient.post(`/meetings/${meetingId}/join`);

/**
 * End a meeting (host only)
 * @param {string} meetingId - The ID of the meeting
 * @returns {Promise}
 */
export const endMeeting = (meetingId) => apiClient.post(`/meetings/${meetingId}/end`);

/**
 * Kick a participant from meeting (host only)
 * @param {string} meetingId - The ID of the meeting
 * @param {string} participantId - The ID of the participant to kick
 * @returns {Promise}
 */
export const kickParticipant = (meetingId, participantId) => apiClient.post(`/meetings/${meetingId}/kick/${participantId}`);

/**
 * Add attachment to a meeting
 * @param {string} meetingId - The ID of the meeting
 * @param {File} file - The file to upload
 * @returns {Promise}
 */
export const addMeetingAttachment = (meetingId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post(`/meetings/${meetingId}/attachments`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

/**
 * Delete attachment from a meeting
 * @param {string} meetingId - The ID of the meeting
 * @param {string} attachmentId - The ID of the attachment to delete
 * @returns {Promise}
 */
export const deleteMeetingAttachment = (meetingId, attachmentId) => {
  return apiClient.delete(`/meetings/${meetingId}/attachments/${attachmentId}`);
};

/**
 * Upload chat history to a meeting
 * @param {string} meetingId - The ID of the meeting
 * @param {File} file - The chat history file
 * @returns {Promise}
 */
export const uploadChatHistory = (meetingId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post(`/meetings/${meetingId}/chat-history`, formData);
};
