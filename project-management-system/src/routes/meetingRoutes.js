const express = require("express");
const router = express.Router();
const MeetingController = require("../controllers/MeetingController");
const { protect } = require("../middleware/authMiddleware");

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

module.exports = router;
