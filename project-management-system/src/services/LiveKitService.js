const { getRoomServiceClient } = require("../config/livekit");
const Meeting = require("../models/Meeting");

const LiveKitService = {
  /**
   * Validate if user can join the meeting
   * @param {string} meetingId - Meeting ID
   * @param {string} userId - User ID
   * @returns {Promise<{canJoin: boolean, meeting: object, isHost: boolean}>}
   */
  async validateParticipant(meetingId, userId) {
    const meeting = await Meeting.findById(meetingId).populate("createdBy", "fullname").populate("participants.userId", "fullname").lean();

    if (!meeting) {
      throw new Error("Meeting not found.");
    }

    // Check if meeting is scheduled
    if (meeting.status !== "scheduled") {
      throw new Error(`Meeting is ${meeting.status}. Only scheduled meetings can be joined.`);
    }

    // Check if user is in participants list
    const participant = meeting.participants.find((p) => p.userId._id.toString() === userId.toString());

    if (!participant) {
      throw new Error("You are not invited to this meeting.");
    }

    // Check if participant has accepted
    if (participant.status !== "accepted") {
      throw new Error("You must accept the invitation before joining.");
    }

    const isHost = meeting.createdBy._id.toString() === userId.toString();

    return {
      canJoin: true,
      meeting,
      isHost,
    };
  },

  /**
   * Get room name for a meeting
   * @param {string} projectKey - Project key
   * @param {string} meetingId - Meeting ID
   * @returns {string} Room name
   */
  getRoomName(projectKey, meetingId) {
    return `${projectKey}-${meetingId}`;
  },

  /**
   * End a meeting (only host can do this)
   * @param {string} meetingId - Meeting ID
   * @param {string} userId - User ID (must be host)
   * @returns {Promise<void>}
   */
  async endMeeting(meetingId, userId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error("Meeting not found.");
    }

    // Only host can end meeting
    if (!meeting.createdBy.equals(userId)) {
      throw new Error("Only the host can end the meeting.");
    }

    // Update meeting status
    meeting.status = "completed";
    await meeting.save();

    // Delete LiveKit room
    const roomServiceClient = getRoomServiceClient();
    try {
      const rooms = await roomServiceClient.listRooms();
      const roomName = this.getRoomName(meeting.projectId.toString(), meetingId);
      const room = rooms.find((r) => r.name === roomName);

      if (room) {
        await roomServiceClient.deleteRoom(roomName);
      }
    } catch (error) {
      console.error("Error deleting LiveKit room:", error);
      // Continue even if room deletion fails
    }

    return meeting;
  },

  /**
   * Kick a participant from meeting (only host can do this)
   * @param {string} meetingId - Meeting ID
   * @param {string} hostId - Host user ID
   * @param {string} participantId - Participant to kick
   * @returns {Promise<void>}
   */
  async kickParticipant(meetingId, hostId, participantId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error("Meeting not found.");
    }

    // Only host can kick
    if (!meeting.createdBy.equals(hostId)) {
      throw new Error("Only the host can kick participants.");
    }

    // Remove participant from LiveKit room
    const roomServiceClient = getRoomServiceClient();
    const roomName = this.getRoomName(meeting.projectId.toString(), meetingId);

    try {
      await roomServiceClient.removeParticipant(roomName, participantId);
    } catch (error) {
      console.error("Error kicking participant:", error);
      throw new Error("Failed to kick participant from meeting.");
    }
  },
};

module.exports = LiveKitService;
