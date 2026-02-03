const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProcessingLogSchema = new Schema(
  {
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    jobId: {
      type: String,
      required: true,
    },

    stage: {
      type: String,
      enum: ["retrieve", "merge", "summarize", "format", "save", "error", "complete"],
    },
    status: {
      type: String,
      enum: ["started", "processing", "completed", "failed"],
    },

    startTime: Date,
    endTime: Date,
    duration: Number, // milliseconds

    // Error tracking
    error: String,
    errorStack: String,
    retryCount: {
      type: Number,
      default: 0,
    },

    // Resource usage
    inputTokens: Number,
    outputTokens: Number,
    costEstimate: Number,

    metadata: Schema.Types.Mixed, // Flexible data per stage

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Index for queries
ProcessingLogSchema.index({ meetingId: 1 });
ProcessingLogSchema.index({ jobId: 1 });
ProcessingLogSchema.index({ createdAt: -1 });

const ProcessingLog = mongoose.model("ProcessingLog", ProcessingLogSchema);
module.exports = ProcessingLog;
