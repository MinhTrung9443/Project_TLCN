const Meeting = require("../models/Meeting");
const Project = require("../models/Project");
const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const summarizeQueue = require("../config/queue");
const ProjectDocument = require("../models/ProjectDocument");

const enqueueSummaryIfReady = async (meetingId) => {
  try {
    const queueReady = summarizeQueue.isQueueReady
      ? summarizeQueue.isQueueReady()
      : summarizeQueue.client?.status === "ready";
    if (!queueReady) return;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) return;

    if (!meeting.chatHistoryLink || !meeting.videoLink || !meeting.transcriptId) {
      return;
    }

    if (meeting.processingStatus === "processing") return;

    const activeJobs = await summarizeQueue.getJobs(["active", "waiting"]);
    const isProcessing = activeJobs.some((job) => job.data.meetingId === meetingId.toString());
    if (isProcessing) return;

    const job = await summarizeQueue.add(
      {
        meetingId: meetingId.toString(),
        regenerate: false,
        options: { source: "auto" },
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

    await Meeting.findByIdAndUpdate(meetingId, {
      processingStatus: "processing",
      lastJobId: job.id,
    });
  } catch (error) {
    console.error("[MeetingService] Auto summary enqueue failed:", error);
  }
};

const MeetingService = {
  /**
   * Tạo cuộc họp mới và gửi thông báo
   * @param {object} meetingData Dữ liệu cuộc họp
   * @param {string} creatorId ID người tạo
   * @returns {Promise<object>} Cuộc họp đã tạo
   */
  async createMeeting(meetingData, creatorId) {
    const { projectId, participants = [] } = meetingData;
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
    
    if (status === "pending") {
      query.status = "scheduled";
    }
    
    if (teamId) {
      query.relatedTeamId = teamId;
    }
    if (memberId) {
      query["participants.userId"] = memberId;
    }

    const meetings = await Meeting.find(query)
      .populate("createdBy", "fullname avatar")
      .populate("participants.userId", "fullname avatar")
      .populate("relatedTeamId", "name")
      .populate("relatedTaskId", "key name")
      .lean();

    // Custom sort: ongoing -> scheduled -> completed, then by startTime descending
    meetings.sort((a, b) => {
      const statusOrder = { ongoing: 0, scheduled: 1, completed: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(b.startTime) - new Date(a.startTime);
    });

    return meetings;
  },

  /**
   * Lấy danh sách cuộc họp cho Admin (có thể lọc)
   * @param {string} projectId ID dự án
   * @param {object} filters Các bộ lọc { teamId, memberId }
   * @returns {Promise<Array>} Danh sách cuộc họp
   */
  async getMeetingsForAdmin(projectId, filters = {}) {
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
      .populate("relatedTeamId", "name description")
      .populate("relatedTaskId", "key name priority")
      .sort({ startTime: -1 })
      .lean();
  },

  /**
   * Lấy danh sách cuộc họp cho Project Manager (có thể lọc)
   * @param {string} projectId ID dự án
   * @param {string} userId ID của PM (để loại trừ cuộc họp đã accepted)
   * @param {object} filters Các bộ lọc { teamId, memberId }
   * @returns {Promise<Array>} Danh sách cuộc họp
   */
  async getMeetingsForPM(projectId, userId, filters = {}) {
    const query = {
      projectId,
      // Loại trừ các cuộc họp mà user đã accepted
      participants: { $not: { $elemMatch: { userId: userId, status: "accepted" } } },
    };

    if (filters.memberId) {
      query["participants.userId"] = filters.memberId;
    }

    if (filters.teamId) {
      query.relatedTeamId = filters.teamId;
    }

    return Meeting.find(query)
      .populate("createdBy", "fullname avatar")
      .populate("participants.userId", "fullname avatar")
      .populate("relatedTeamId", "name description")
      .populate("relatedTaskId", "key name priority")
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

    // Tìm team mà người này làm leader (1 leader chỉ lead 1 team)
    const ledTeam = project.teams.find((team) => team.leaderId.equals(leaderId));

    if (!ledTeam) {
      return []; // Không lead team nào thì return empty
    }

    const query = {
      projectId,
      // Loại trừ các cuộc họp mà leader đã accepted
      participants: { $not: { $elemMatch: { userId: leaderId, status: "accepted" } } },
      $or: [
        // Các cuộc họp liên quan đến team mình lead
        { relatedTeamId: ledTeam._id },
        // Các cuộc họp của các thành viên trong team
        { "participants.userId": { $in: ledTeam.members } },
      ],
    };

    return Meeting.find(query)
      .populate("createdBy", "fullname avatar")
      .populate("participants.userId", "fullname avatar")
      .populate("relatedTeamId", "name description")
      .populate("relatedTaskId", "key name priority")
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

    // Xóa tất cả attachment từ Cloudinary
    if (meeting.attachments && meeting.attachments.length > 0) {
      for (const attachment of meeting.attachments) {
        try {
          await cloudinary.uploader.destroy(attachment.public_id);
        } catch (error) {
          console.error(`Error deleting attachment ${attachment.public_id}:`, error);
        }
      }
    }

    await meeting.deleteOne();
    return { message: "The meeting has been successfully deleted." };
  },

  /**
   * Thêm attachment vào cuộc họp
   */
  async addAttachment(meetingId, file, userId) {
    if (!file) {
      const error = new Error("No file provided");
      error.statusCode = 400;
      throw error;
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      // Xóa file từ Cloudinary nếu meeting không tồn tại
      await cloudinary.uploader.destroy(file.filename);
      const error = new Error("Meeting not found");
      error.statusCode = 404;
      throw error;
    }

    // Kiểm tra quyền (chỉ người tạo mới có thể thêm attachment)
    if (!meeting.createdBy.equals(userId)) {
      await cloudinary.uploader.destroy(file.filename);
      const error = new Error("You do not have permission to add attachments to this meeting");
      error.statusCode = 403;
      throw error;
    }

    if (meeting.status === "completed") {
      await cloudinary.uploader.destroy(file.filename);
      const error = new Error("Cannot add attachments to a completed meeting");
      error.statusCode = 400;
      throw error;
    }

    const newAttachment = {
      filename: file.originalname,
      url: file.path,
      public_id: file.filename,
    };

    meeting.attachments.push(newAttachment);
    const updatedMeeting = await meeting.save();

    // Create ProjectDocument entry for meeting attachment (share with meeting members + PM)
    try {
      const project = await Project.findById(meeting.projectId).lean();
      const pmIds = project?.members?.filter((m) => m.role === "PROJECT_MANAGER").map((m) => m.userId) || [];
      const participantIds = (meeting.participants || []).map((p) => p.userId).filter(Boolean);
      const sharedWith = [...new Set([...pmIds, ...participantIds].map((id) => id.toString()))].map((id) => mongoose.Types.ObjectId(id));

      await ProjectDocument.create({
        projectId: meeting.projectId,
        filename: newAttachment.filename,
        url: newAttachment.url,
        public_id: newAttachment.public_id,
        category: "other",
        version: "v1",
        tags: [],
        sourceType: "meeting",
        parent: {
          meetingId: meeting._id,
          meetingTitle: meeting.title,
        },
        uploadedBy: userId,
        sharedWith,
        uploadedAt: newAttachment.uploadedAt || new Date(),
      });
    } catch (docError) {
      console.error("[MeetingService] Failed to create ProjectDocument:", docError.message);
    }

    return updatedMeeting.populate("createdBy", "fullname avatar");
  },

  /**
   * Xóa attachment từ cuộc họp
   */
  async deleteAttachment(meetingId, attachmentId, userId) {
    if (!mongoose.Types.ObjectId.isValid(meetingId) || !mongoose.Types.ObjectId.isValid(attachmentId)) {
      const error = new Error("Invalid ID");
      error.statusCode = 400;
      throw error;
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      const error = new Error("Meeting not found");
      error.statusCode = 404;
      throw error;
    }

    // Kiểm tra quyền
    if (!meeting.createdBy.equals(userId)) {
      const error = new Error("You do not have permission to delete attachments from this meeting");
      error.statusCode = 403;
      throw error;
    }

    const attachment = meeting.attachments.id(attachmentId);
    if (!attachment) {
      const error = new Error("Attachment not found");
      error.statusCode = 404;
      throw error;
    }

    if (meeting.status === "completed") {
      const error = new Error("Cannot delete attachments from a completed meeting");
      error.statusCode = 400;
      throw error;
    }

    try {
      await cloudinary.uploader.destroy(attachment.public_id);
    } catch (cloudinaryError) {
      console.error(`Error deleting file from Cloudinary (public_id: ${attachment.public_id}):`, cloudinaryError);
    }

    meeting.attachments.pull(attachmentId);
    const updatedMeeting = await meeting.save();

    return updatedMeeting.populate("createdBy", "fullname avatar");
  },

  /**
   * Upload chat history file to meeting
   */
  async uploadChatHistory(meetingId, file, userId) {
    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
      const error = new Error("Invalid meeting ID");
      error.statusCode = 400;
      throw error;
    }

    if (!file) {
      const error = new Error("No file provided");
      error.statusCode = 400;
      throw error;
    }

    if (!file.buffer) {
      console.error("File object received but no buffer:", {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        hasBuffer: !!file.buffer,
        bufferLength: file.buffer ? file.buffer.length : 0,
      });
      const error = new Error("File buffer is empty");
      error.statusCode = 400;
      throw error;
    }



    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      const error = new Error("Meeting not found");
      error.statusCode = 404;
      throw error;
    }

    // Kiểm tra quyền - chỉ host có thể upload chat history
    if (!meeting.createdBy.equals(userId)) {
      const error = new Error("You do not have permission to upload chat history");
      error.statusCode = 403;
      throw error;
    }

    try {
      // Upload file using a promise wrapper
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "meeting_chat_history",
            resource_type: "auto",
            filename_override: file.originalname || "chat-history.txt",
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary stream error:", error);
              reject(error);
            } else {
              resolve(result);
            }
          },
        );

        stream.end(file.buffer);
      });

      // Update meeting with chat history link
      meeting.chatHistoryLink = result.secure_url;
      const updatedMeeting = await meeting.save();

      // Create ProjectDocument entry for chat history
      try {
        const project = await Project.findById(meeting.projectId);
        if (project) {
          const pmIds = project.members.filter((m) => m.role === "PROJECT_MANAGER").map((m) => m.userId);
          const memberIds = (meeting.participants || []).map((p) => p.userId).filter(Boolean);
          const sharedWith = [...new Set([...memberIds, ...pmIds].map(id => id.toString()))].map(id => mongoose.Types.ObjectId(id));

          await ProjectDocument.create({
            projectId: meeting.projectId,
            filename: `Chat History - ${meeting.title || 'Meeting'}`,
            url: result.secure_url,
            public_id: result.public_id,
            category: "other",
            version: "v1",
            tags: ["chat", "history"],
            sourceType: "meeting",
            parent: {
              meetingId: meeting._id,
              meetingTitle: meeting.title,
            },
            uploadedBy: userId,
            sharedWith,
            uploadedAt: new Date(),
          });
        }
      } catch (docError) {
        console.error("Failed to create ProjectDocument for chat history:", docError);
      }

      await enqueueSummaryIfReady(updatedMeeting._id);

      return updatedMeeting.populate("createdBy", "fullname avatar");
    } catch (cloudinaryError) {
      console.error("Error uploading chat history to Cloudinary:", cloudinaryError);
      const error = new Error("Failed to upload chat history: " + (cloudinaryError.message || "Unknown error"));
      error.statusCode = 500;
      throw error;
    }
  },

  /**
   * Upload recording file to meeting
   */
  async uploadRecording(meetingId, file, userId) {
    console.log("[MeetingService.uploadRecording] meetingId:", meetingId);
    console.log("[MeetingService.uploadRecording] file:", file ? `${file.originalname} (${file.size} bytes)` : "No file");
    console.log("[MeetingService.uploadRecording] userId:", userId);

    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
      const error = new Error("Invalid meeting ID");
      error.statusCode = 400;
      throw error;
    }

    if (!file) {
      const error = new Error("No file provided");
      error.statusCode = 400;
      throw error;
    }

    if (!file.buffer) {
      const error = new Error("File buffer is empty");
      error.statusCode = 400;
      throw error;
    }

    const meeting = await Meeting.findById(meetingId);
    console.log("[MeetingService.uploadRecording] Meeting found:", meeting ? "Yes" : "No");
    if (!meeting) {
      const error = new Error("Meeting not found");
      error.statusCode = 404;
      throw error;
    }

    // Kiểm tra quyền - chỉ host có thể upload recording
    console.log("[MeetingService.uploadRecording] Checking permissions - createdBy:", meeting.createdBy, "userId:", userId);
    if (!meeting.createdBy.equals(userId)) {
      const error = new Error("You do not have permission to upload recording");
      error.statusCode = 403;
      throw error;
    }

    try {
      console.log("[MeetingService.uploadRecording] Starting Cloudinary upload...");
      // Upload video file to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "meeting_recordings",
            resource_type: "video",
            filename_override: file.originalname || "meeting-recording.webm",
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary stream error:", error);
              reject(error);
            } else {
              console.log("[MeetingService.uploadRecording] Cloudinary upload success:", result.secure_url);
              resolve(result);
            }
          },
        );

        stream.end(file.buffer);
      });

      // Update meeting with video link using findByIdAndUpdate to avoid version conflicts
      const updatedMeeting = await Meeting.findByIdAndUpdate(
        meetingId,
        { $set: { videoLink: result.secure_url } },
        { new: true, runValidators: true }
      ).populate("createdBy", "fullname avatar");
      
      console.log("[MeetingService.uploadRecording] Meeting updated with videoLink:", updatedMeeting.videoLink);

      // Create ProjectDocument entry for video recording
      try {
        const project = await Project.findById(meeting.projectId);
        if (project) {
          const pmIds = project.members.filter((m) => m.role === "PROJECT_MANAGER").map((m) => m.userId);
          const memberIds = (meeting.participants || []).map((p) => p.userId).filter(Boolean);
          const sharedWith = [...new Set([...memberIds, ...pmIds].map(id => id.toString()))].map(id => mongoose.Types.ObjectId(id));

          await ProjectDocument.create({
            projectId: meeting.projectId,
            filename: `Video - ${meeting.title || 'Meeting'}`,
            url: result.secure_url,
            public_id: result.public_id,
            category: "other",
            version: "v1",
            tags: ["video", "recording"],
            sourceType: "meeting",
            parent: {
              meetingId: meeting._id,
              meetingTitle: meeting.title,
            },
            uploadedBy: userId,
            sharedWith,
            uploadedAt: new Date(),
          });
        }
      } catch (docError) {
        console.error("Failed to create ProjectDocument for video recording:", docError);
      }

      await enqueueSummaryIfReady(updatedMeeting._id);

      return updatedMeeting;
    } catch (cloudinaryError) {
      console.error("Error uploading recording to Cloudinary:", cloudinaryError);
      const error = new Error("Failed to upload recording: " + (cloudinaryError.message || "Unknown error"));
      error.statusCode = 500;
      throw error;
    }
  },
};

module.exports = MeetingService;
