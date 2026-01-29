const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Sub-document để lưu trạng thái tham gia của mỗi thành viên
const ParticipantSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    reason: {
      type: String,
    },
  },
  { _id: false },
);

const MeetingSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "canceled"],
      default: "scheduled",
    },
    description: {
      type: String,
      trim: true,
    },
    relatedTeamId: {
      type: Schema.Types.ObjectId,
      ref: "Group"
    },
    relatedTaskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
    },
    participants: [ParticipantSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    videoLink: {
      type: String,
      trim: true,
    },
    chatHistoryLink: {
      type: String,
      trim: true,
    },
    documentLink: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

// Tối ưu hóa truy vấn
MeetingSchema.index({ projectId: 1, startTime: -1 });
MeetingSchema.index({ "participants.userId": 1, startTime: -1 });

const Meeting = mongoose.model("Meeting", MeetingSchema);
module.exports = Meeting;
