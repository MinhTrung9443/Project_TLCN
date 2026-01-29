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
