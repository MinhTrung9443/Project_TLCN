const MeetingService = require("../services/MeetingService");

const Project = require("../models/Project"); // Cần import Project model

const MeetingController = {
  /**
   * Tạo cuộc họp mới
   */
  async createMeeting(req, res) {
    try {
      const meeting = await MeetingService.createMeeting(req.body, req.user._id);
      res.status(201).json(meeting);
    } catch (error) {
      res.status(400).json({ message: "Tạo cuộc họp thất bại", error: error.message });
    }
  },

  /**
   * Lấy danh sách cuộc họp theo dự án (phân quyền theo vai trò)
   */
  async getMeetingsByProject(req, res) {
    try {
      const { projectId, status, teamId, memberId } = req.query;
      const userId = req.user._id;

      if (!projectId) {
        return res.status(400).json({ message: "Cần cung cấp projectId." });
      }

      const project = await Project.findById(projectId).select("members teams").lean();
      if (!project) {
        return res.status(404).json({ message: "Không tìm thấy dự án." });
      }

      let meetings = await MeetingService.getMeetingsByProject(userId, projectId, status);
      return res.status(200).json(meetings);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  /**
   * Lấy lịch trình của tôi
   */
  async getMySchedule(req, res) {
    try {
      const meetings = await MeetingService.getMySchedule(req.user._id, req.body.startTime, req.body.endTime);
      res.status(200).json(meetings);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  /**
   * Cập nhật cuộc họp
   */
  async updateMeeting(req, res) {
    try {
      const meeting = await MeetingService.updateMeeting(req.params.meetingId, req.body, req.user._id);
      res.status(200).json(meeting);
    } catch (error) {
      res.status(400).json({ message: "Fail to update meeting", error: error.message });
    }
  },

  /**
   * Chấp nhận / Từ chối lời mời
   */
  async handleRsvp(req, res) {
    try {
      const { status, reason } = req.body;
      if (!["accepted", "declined"].includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
      }
      const meeting = await MeetingService.handleRsvp(req.params.meetingId, req.user._id, status, reason);
      res.status(200).json(meeting);
    } catch (error) {
      res.status(400).json({ message: "Fail to process RSVP", error: error.message });
    }
  },

  /**
   * Xóa cuộc họp
   */
  async deleteMeeting(req, res) {
    try {
      const result = await MeetingService.deleteMeeting(req.params.meetingId, req.user._id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: "Fail to delete meeting", error: error.message });
    }
  },

  /**
   * Lấy danh sách cuộc họp mà người dùng quản lý
   * - Admin: lấy toàn bộ cuộc họp của project
   * - PM: lấy tất cả cuộc họp của project
   * - Team Leader: lấy cuộc họp của các team mà mình lead
   */
  async getManagedMeetings(req, res) {
    try {
      const { projectId } = req.query;
      const userId = req.user._id;
      const userRole = req.user.role;

      if (!projectId) {
        return res.status(400).json({ message: "Cần cung cấp projectId." });
      }

      const project = await Project.findById(projectId).select("members teams").lean();

      if (!project) {
        return res.status(404).json({ message: "Không tìm thấy dự án." });
      }

      let meetings;

      if (userRole === "admin") {
        // Admin: lấy tất cả cuộc họp của project (trừ cuộc họp đã accepted)
        meetings = await MeetingService.getMeetingsForAdmin(projectId);
      } else if (project.members.some((m) => m.userId.equals(userId))) {
        // PM: lấy tất cả cuộc họp của project (trừ cuộc họp đã accepted)
        meetings = await MeetingService.getMeetingsForPM(projectId, userId);
      } else if (project.teams.some((t) => t.leaderId.equals(userId))) {
        // Team Leader: lấy cuộc họp của các team mà mình lead (trừ cuộc họp đã accepted)
        meetings = await MeetingService.getMeetingsForLeader(projectId, userId);
      }

      return res.status(200).json(meetings);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  /**
   * Thêm attachment vào cuộc họp
   */
  async addAttachment(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user._id;

      const updatedMeeting = await MeetingService.addAttachment(meetingId, req.file, userId);
      res.status(200).json(updatedMeeting);
    } catch (error) {
      console.error("Error adding attachment:", error);
      res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
  },

  /**
   * Xóa attachment từ cuộc họp
   */
  async deleteAttachment(req, res) {
    try {
      const { meetingId, attachmentId } = req.params;
      const userId = req.user._id;

      const updatedMeeting = await MeetingService.deleteAttachment(meetingId, attachmentId, userId);
      res.status(200).json(updatedMeeting);
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
  },

  /**
   * Upload chat history file to meeting
   */
  async uploadChatHistory(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user._id;

      const updatedMeeting = await MeetingService.uploadChatHistory(meetingId, req.file, userId);
      res.status(200).json(updatedMeeting);
    } catch (error) {
      console.error("Error uploading chat history:", error);
      res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
  },

  /**
   * Upload recording file to meeting
   */
  async uploadRecording(req, res) {
    try {
      console.log("[uploadRecording] Received request for meetingId:", req.params.meetingId);
      console.log("[uploadRecording] File:", req.file ? `${req.file.originalname} (${req.file.size} bytes)` : "No file");
      console.log("[uploadRecording] User:", req.user._id);

      const { meetingId } = req.params;
      const userId = req.user._id;

      const updatedMeeting = await MeetingService.uploadRecording(meetingId, req.file, userId);
      console.log("[uploadRecording] Recording uploaded successfully. videoLink:", updatedMeeting.videoLink);
      res.status(200).json(updatedMeeting);
    } catch (error) {
      console.error("[uploadRecording] Error:", error);
      res.status(error.statusCode || 500).json({ message: error.message || "Server Error" });
    }
  },
};

module.exports = MeetingController;
