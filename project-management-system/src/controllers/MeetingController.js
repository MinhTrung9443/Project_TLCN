const MeetingService = require("../services/MeetingService");

const Project = require('../models/Project'); // Cần import Project model

const MeetingController = {
  /**
   * Tạo cuộc họp mới
   */
  async createMeeting(req, res) {
    try {
      const meeting = await MeetingService.createMeeting(req.body, req.user._id);
      res.status(201).json(meeting);
    } catch (error) {
      res.status(400).json({ message: 'Tạo cuộc họp thất bại', error: error.message });
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
        return res.status(400).json({ message: 'Cần cung cấp projectId.' });
      }
      
      const project = await Project.findById(projectId).select('members teams').lean();
      if (!project) {
        return res.status(404).json({ message: 'Không tìm thấy dự án.' });
      }

      let meetings;

      // 1. Kiểm tra có phải là Project Manager không?
      const pmInfo = project.members.find(m => m.userId.equals(userId) && m.role === 'PROJECT_MANAGER');
      if (pmInfo) {
        const filters = { teamId, memberId };
        meetings = await MeetingService.getMeetingsForPM(projectId, filters);
        return res.status(200).json(meetings);
      }

      // 2. Nếu không phải PM, kiểm tra có phải là Leader không?
      const isLeader = project.teams.some(t => t.leaderId.equals(userId));
      if (isLeader) {
        meetings = await MeetingService.getMeetingsForLeader(projectId, userId);
        return res.status(200).json(meetings);
      }

      // 3. Nếu không phải cả hai, kiểm tra có phải là Member không?
      const memberInfo = project.teams.some(t => t.members.includes(userId));
      if (memberInfo) {
        meetings = await MeetingService.getMeetingsByProject(userId, projectId, status);
        return res.status(200).json(meetings);
      }
      
      // 4. Nếu không phải tất cả các vai trò trên
      return res.status(403).json({ message: 'You are not authorized to view this data.' });

    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
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
      const { status } = req.body;
      if (!["accepted", "declined"].includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
      }
      const meeting = await MeetingService.handleRsvp(req.params.meetingId, req.user._id, status);
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
};

module.exports = MeetingController;
