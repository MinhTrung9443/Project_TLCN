const { getRoomServiceClient } = require("../config/livekit");
const Meeting = require("../models/Meeting");
const summarizeQueue = require("../config/queue");

const enqueueSummaryIfReady = async (meeting) => {
  try {
    const queueReady = summarizeQueue.isQueueReady ? summarizeQueue.isQueueReady() : summarizeQueue.client?.status === "ready";

    console.log("[LiveKitService] enqueueSummaryIfReady called", {
      meetingId: meeting?._id?.toString(),
      hasVideo: !!meeting?.videoLink,
      hasTranscript: !!meeting?.transcriptId,
      processingStatus: meeting?.processingStatus,
      queueConnected: queueReady,
    });

    if (!queueReady) return;
    if (!meeting?.videoLink) return;
    if (meeting.processingStatus === "processing") return;

    const activeJobs = await summarizeQueue.getJobs(["active", "waiting"]);
    const isProcessing = activeJobs.some((job) => job.data.meetingId === meeting._id.toString());
    if (isProcessing) {
      console.log("[LiveKitService] Summary job already in queue", {
        meetingId: meeting._id.toString(),
      });
      return;
    }

    const job = await summarizeQueue.add(
      {
        meetingId: meeting._id.toString(),
        regenerate: false,
        options: { source: "auto_end_meeting" },
      },
      {
        attempts: parseInt(process.env.MAX_SUMMARY_RETRIES) || 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: false,
        timeout: parseInt(process.env.SUMMARY_TIMEOUT) || 300000,
      },
    );

    await Meeting.findByIdAndUpdate(meeting._id, {
      processingStatus: "processing",
      lastJobId: job.id,
    });

    console.log("[LiveKitService] Summary job enqueued", {
      meetingId: meeting._id.toString(),
      jobId: job.id,
    });
  } catch (error) {
    console.error("[LiveKitService] Auto summary enqueue failed:", error);
  }
};

const scheduleSummaryCheck = (meetingId, startedAt, attemptsLeft = 10, delayMs = 30000) => {
  console.log("[LiveKitService] scheduleSummaryCheck", {
    meetingId: meetingId.toString(),
    startedAt,
    attemptsLeft,
    delayMs,
  });
  setTimeout(async () => {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        console.log("[LiveKitService] scheduleSummaryCheck: meeting not found", { meetingId: meetingId.toString() });
        return;
      }

      if (meeting.videoLink) {
        const waitMs = 120000;
        const elapsedMs = Date.now() - startedAt;
        const canProceedWithoutChat = elapsedMs >= waitMs;

        if (meeting.chatHistoryLink || canProceedWithoutChat) {
          console.log("[LiveKitService] scheduleSummaryCheck: ready, enqueueing", {
            meetingId: meetingId.toString(),
            hasChat: !!meeting.chatHistoryLink,
            elapsedMs,
          });
          await enqueueSummaryIfReady(meeting);
          return;
        }

        console.log("[LiveKitService] scheduleSummaryCheck: waiting for chat", {
          meetingId: meetingId.toString(),
          elapsedMs,
          waitMs,
        });
      }

      console.log("[LiveKitService] scheduleSummaryCheck: not ready", {
        meetingId: meetingId.toString(),
        hasVideo: !!meeting.videoLink,
        hasTranscript: !!meeting.transcriptId,
        attemptsLeft,
      });

      if (attemptsLeft > 1) {
        scheduleSummaryCheck(meetingId, startedAt, attemptsLeft - 1, delayMs);
      }
    } catch (error) {
      console.error("[LiveKitService] Summary readiness check failed:", error);
    }
  }, delayMs);
};

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

    console.log("[LiveKitService] endMeeting completed", {
      meetingId: meetingId.toString(),
      hasVideo: !!meeting.videoLink,
      hasTranscript: !!meeting.transcriptId,
    });

    const summaryWaitStart = Date.now();

    // Auto enqueue summary if ready and chat is available
    if (meeting.videoLink && meeting.transcriptId && meeting.chatHistoryLink) {
      await enqueueSummaryIfReady(meeting);
    } else {
      // Retry in background until ready, or 2 minutes have passed without chat
      scheduleSummaryCheck(meeting._id, summaryWaitStart);
    }

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
