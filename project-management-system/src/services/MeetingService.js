const Meeting = require("../models/Meeting");
const Project = require("../models/Project");
const mongoose = require("mongoose");

const MeetingService = {
  /**
   * Tạo cuộc họp mới và gửi thông báo
   * @param {object} meetingData Dữ liệu cuộc họp
   * @param {string} creatorId ID người tạo
   * @returns {Promise<object>} Cuộc họp đã tạo
   */
  async createMeeting(meetingData, creatorId) {
    const { projectId, participants = [] } = meetingData;
    console.log("Creating meeting with data:", meetingData, "by user:", creatorId);
    const project = await Project.findById(projectId).select("members teams").lean();
    if (!project) {
      throw new Error("Project not found.");
    }

    // Kiểm tra xem người tạo có phải là thành viên của dự án không
    const isProjectMember = project.members.some((m) => m.userId.equals(creatorId));
    const isTeamLeader = project.teams.some((t) => t.leaderId.equals(creatorId));
    const isTeamMember = project.teams.some((t) => t.members.some((m) => m.equals(creatorId)));

    if (!project || (!isProjectMember && !isTeamLeader && !isTeamMember)) {
      throw new Error("You are not a member of the project.");
    }

    // Đảm bảo người tạo cũng là một người tham gia và đã chấp nhận
    const creatorParticipant = participants.find((p) => p.userId.equals(creatorId));
    if (!creatorParticipant) {
      participants.push({ userId: creatorId, status: "accepted" });
    } else {
      creatorParticipant.status = "accepted";
    }

    meetingData.members.forEach((t) => {
      participants.push({ userId: t, status: "pending" });
    });

    const meeting = new Meeting({
      ...meetingData,
      createdBy: creatorId,
      participants,
    });

    await meeting.save();
    await meeting.populate("createdBy", "fullname avatar");
    await meeting.populate("participants.userId", "fullname avatar");

    // Gửi thông báo đến tất cả người tham gia ngoại trừ người tạo
    // code hoàn thiện sau
    return meeting;
  },

  /**
   * Lấy danh sách các cuộc họp theo dự án, có thể lọc theo trạng thái
   * @param {string} userId ID người dùng hiện tại
   * @param {string} projectId ID dự án
   * @returns {Promise<Array>} Danh sách cuộc họp
   * @param {string|null} status Trạng thái tham gia ('pending', 'accepted', 'declined')
   * @param {string|null} teamId ID đội (nếu lọc theo đội)
   * @param {string|null} memberId ID thành viên (nếu lọc theo thành viên)
   */
  async getMeetingsByProject(userId, projectId, status, teamId, memberId) {
    const query = { projectId, participants: { $elemMatch: { userId: userId, status: status || "accepted" } } };

    if (teamId) {
      query.relatedTeamId = teamId;
    }
    if (memberId) {
      query["participants.userId"] = memberId;
    }

    return Meeting.find(query)
      .populate("createdBy", "fullname avatar")
      .populate("participants.userId", "fullname avatar")
      .populate("relatedTeamId", "name")
      .populate("relatedTaskId", "key name")
      .sort({ startTime: -1 })
      .lean();
  },

  /**
   * Lấy danh sách cuộc họp cho Project Manager (có thể lọc)
   * @param {string} projectId ID dự án
   * @param {object} filters Các bộ lọc { teamId, memberId }
   * @returns {Promise<Array>} Danh sách cuộc họp
   */
  async getMeetingsForPM(projectId, filters = {}) {
    const query = { projectId };

    if (filters.memberId) {
      query["participants.userId"] = filters.memberId;
    }

    if (filters.teamId) {
      query.relatedTeamId = filters.teamId;
    }

    return Meeting.find(query)
      .populate("createdBy", "fullname avatar")
      .populate("participants.userId", "fullname avatar")
      .sort({ startTime: -1 })
      .lean();
  },

  /**
   * Lấy danh sách cuộc họp cho Team Leader
   * @param {string} projectId ID dự án
   * @param {string} leaderId ID của leader
   * @returns {Promise<Array>} Danh sách cuộc họp
   */
  async getMeetingsForLeader(projectId, leaderId, filters = {}) {
    const project = await Project.findById(projectId).select("teams").lean();
    if (!project) throw new Error("Project not found.");

    // Tìm tất cả các team mà người này làm leader
    const ledTeams = project.teams.filter((team) => team.leaderId.equals(leaderId));
    const ledTeamIds = ledTeams.map((team) => team.teamId);

    const query = {
      projectId,
      $or: [
        // Các cuộc họp của các team mình lead
        { relatedTo: "team", relatedId: { $in: ledTeamIds } },
        // Các cuộc họp mình được mời tham gia trực tiếp
        { "participants.userId": leaderId },
      ],
    };

    return Meeting.find(query)
      .populate("createdBy", "fullname avatar")
      .populate("participants.userId", "fullname avatar")
      .sort({ startTime: -1 })
      .lean();
  },

  /**
   * Lấy lịch trình của người dùng (tất cả cuộc họp tham gia trên mọi dự án)
   * @param {string} userId ID người dùng
   * @returns {Promise<Array>} Danh sách cuộc họp
   */
  async getMySchedule(userId, startTime, endTime) {
    return Meeting.find({
      "participants.userId": userId,
      "participants.status": "accepted",
      startTime: { $gte: startTime },
      endTime: { $lte: endTime },
    })
      .populate("projectId", "name key")
      .populate("createdBy", "fullname avatar")
      .sort({ startTime: -1 })
      .lean();
  },

  /**
   * Cập nhật thông tin cuộc họp
   * @param {string} meetingId ID cuộc họp
   * @param {object} updateData Dữ liệu cập nhật
   * @param {string} userId ID người thực hiện
   * @returns {Promise<object>} Cuộc họp đã cập nhật
   */
  async updateMeeting(meetingId, updateData, userId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw new Error("Meeting not found.");

    // Kiểm tra trạng thái - không cho phép cập nhật nếu đang diễn ra hoặc đã hoàn thành
    if (meeting.status === "ongoing") {
      throw new Error("Cannot update an ongoing meeting.");
    }
    if (meeting.status === "completed") {
      throw new Error("Cannot update a completed meeting.");
    }

    // Chỉ người tạo mới có quyền cập nhật
    if (!meeting.createdBy.equals(userId)) {
      throw new Error("You do not have permission to update this meeting.");
    }

    // Cập nhật các trường cho phép
    const allowedUpdates = ["title", "description", "status", "startTime", "endTime"];
    allowedUpdates.forEach((key) => {
      if (updateData[key] !== undefined) {
        meeting[key] = updateData[key];
      }
    });

    await meeting.save();

    // Gửi thông báo về việc cập nhật cuộc họp

    return meeting;
  },

  /**
   * Xử lý việc chấp nhận/từ chối tham gia cuộc họp
   * @param {string} meetingId ID cuộc họp
   * @param {string} userId ID người dùng
   * @param {string} status 'accepted' hoặc 'declined'
   * @returns {Promise<object>} Cuộc họp đã cập nhật
   */
  async handleRsvp(meetingId, userId, status, reason) {
    const meeting = await Meeting.findOne({ _id: meetingId, "participants.userId": userId });
    if (!meeting) {
      throw new Error("Invitation to this meeting not found.");
    }
    if (meeting.status !== "scheduled") {
      throw new Error("Cannot respond to an invitation for a meeting that is not in 'scheduled' status.");
    }
    const participant = meeting.participants.find((p) => p.userId.equals(userId));
    if (participant) {
      participant.status = status;
      if (status === "declined" && reason) {
        participant.reason = reason;
      }
    }

    await meeting.save();

    return meeting;
  },

  /**
   * Xóa cuộc họp
   * @param {string} meetingId ID cuộc họp
   * @param {string} userId ID người thực hiện
   * @returns {Promise<object>}
   */
  async deleteMeeting(meetingId, userId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw new Error("Meeting not found.");

    // Chỉ người tạo mới có quyền xóa
    if (!meeting.createdBy.equals(userId)) {
      throw new Error("You do not have permission to delete this meeting.");
    }

    if (meeting.status === "ongoing") {
      throw new Error("Cannot delete an ongoing meeting.");
    }
    if (meeting.status === "completed") {
      throw new Error("Cannot delete a completed meeting.");
    }

    await meeting.deleteOne();
    return { message: "The meeting has been successfully deleted." };
  },
};

module.exports = MeetingService;
