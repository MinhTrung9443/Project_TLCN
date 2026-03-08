const express = require("express");
const router = express.Router();
const MeetingController = require("../controllers/MeetingController");
const LiveKitController = require("../controllers/LiveKitController");
const { protect } = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");

const handleMulterError = (uploadHandler, fileTypeLabel, maxMb) => (req, res, next) => {
  uploadHandler(req, res, (err) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: `${fileTypeLabel} is too large. Maximum size is ${maxMb}MB.`,
        error: "LIMIT_FILE_SIZE",
      });
    }

    return res.status(400).json({
      message: `Failed to upload ${fileTypeLabel.toLowerCase()}.`,
      error: err.message,
    });
  });
};

const chatHistoryMaxMb = 10;
const recordingMaxMb = parseInt(process.env.MEETING_RECORDING_MAX_MB, 10) || 100;

// Tất cả các route dưới đây đều yêu cầu xác thực
router.use(protect);

// Định nghĩa các endpoints
router.post("/", MeetingController.createMeeting);
router.get("/", MeetingController.getMeetingsByProject);
router.get("/managed", MeetingController.getManagedMeetings);
router.get("/my-schedule", MeetingController.getMySchedule);
router.put("/:meetingId", MeetingController.updateMeeting);
router.post("/:meetingId/rsvp", MeetingController.handleRsvp);
router.delete("/:meetingId", MeetingController.deleteMeeting);

// Attachment routes
router.post("/:meetingId/attachments", uploadMiddleware.single("file"), MeetingController.addAttachment);
router.post("/:meetingId/attachments/from-doc", MeetingController.addAttachmentFromDocument);
router.delete("/:meetingId/attachments/:attachmentId", MeetingController.deleteAttachment);

// Chat history route - using chatHistoryUpload with memory storage
router.post(
  "/:meetingId/chat-history",
  handleMulterError(uploadMiddleware.chatHistoryUpload.single("file"), "Chat history file", chatHistoryMaxMb),
  (req, res, next) => {
    next();
  },
  MeetingController.uploadChatHistory,
);

// Recording upload route
router.post(
  "/:meetingId/recording",
  handleMulterError(uploadMiddleware.recordingUpload.single("file"), "Recording file", recordingMaxMb),
  (req, res, next) => {
    next();
  },
  MeetingController.uploadRecording,
);

// LiveKit routes
router.post("/:meetingId/join", LiveKitController.joinMeeting);
router.post("/:meetingId/end", LiveKitController.endMeeting);
router.post("/:meetingId/kick/:participantId", LiveKitController.kickParticipant);

module.exports = router;
