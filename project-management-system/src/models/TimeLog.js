const mongoose = require("mongoose");
const { Schema } = mongoose;

// TimeLog Schema - Lưu lịch sử log thời gian làm việc
const timeLogSchema = new Schema(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    timeSpent: {
      type: Number, // Thời gian làm việc (giờ)
      required: true,
      min: 0,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    logDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index để query nhanh
timeLogSchema.index({ taskId: 1, createdAt: -1 });

module.exports = mongoose.model("TimeLog", timeLogSchema);
