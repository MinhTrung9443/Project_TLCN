const LiveKitService = require("../services/LiveKitService");
const { createToken, LIVEKIT_URL } = require("../config/livekit");
const Project = require("../models/Project");

const LiveKitController = {
  /**
   * Generate token to join meeting
   * POST /api/meetings/:meetingId/join
   */
  async joinMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user._id;
      const userName = req.user.fullname;

      // Validate participant
      const { canJoin, meeting, isHost } = await LiveKitService.validateParticipant(meetingId, userId);

      if (!canJoin) {
        return res.status(403).json({ message: "You cannot join this meeting." });
      }

      // Get project key
      const project = await Project.findById(meeting.projectId).select("key").lean();
      if (!project) {
        return res.status(404).json({ message: "Project not found." });
      }

      // Generate room name
      const roomName = LiveKitService.getRoomName(project.key, meetingId);

      // Generate access token (await the async function)
      const token = await createToken(roomName, userName, userId.toString(), isHost);

      console.log("[LiveKitController] Sending token response, token type:", typeof token, "token length:", token?.length);

      return res.status(200).json({
        token,
        roomName,
        serverUrl: LIVEKIT_URL,
        meetingUrl: `/meeting-room/${meetingId}`,
        isHost,
        meeting: {
          title: meeting.title,
          description: meeting.description,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          participants: meeting.participants,
          attachments: meeting.attachments,
        },
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  /**
   * End meeting (host only)
   * POST /api/meetings/:meetingId/end
   */
  async endMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user._id;

      const meeting = await LiveKitService.endMeeting(meetingId, userId);

      return res.status(200).json({
        message: "Meeting ended successfully.",
        meeting,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  /**
   * Kick participant (host only)
   * POST /api/meetings/:meetingId/kick/:participantId
   */
  async kickParticipant(req, res) {
    try {
      const { meetingId, participantId } = req.params;
      const userId = req.user._id;

      await LiveKitService.kickParticipant(meetingId, userId, participantId);

      return res.status(200).json({
        message: "Participant kicked successfully.",
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },
};

module.exports = LiveKitController;
