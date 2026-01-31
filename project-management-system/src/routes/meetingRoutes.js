const express = require("express");
const router = express.Router();
const MeetingController = require("../controllers/MeetingController");
const LiveKitController = require("../controllers/LiveKitController");
const { protect } = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");

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
router.delete("/:meetingId/attachments/:attachmentId", MeetingController.deleteAttachment);

// LiveKit routes
router.post("/:meetingId/join", LiveKitController.joinMeeting);
router.post("/:meetingId/end", LiveKitController.endMeeting);
router.post("/:meetingId/kick/:participantId", LiveKitController.kickParticipant);

module.exports = router;
