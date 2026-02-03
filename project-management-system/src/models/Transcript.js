const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TranscriptSchema = new Schema(
  {
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },

    // Raw data
    audioUrl: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // seconds
    },

    // Processed
    rawTranscript: {
      type: String,
      trim: true,
    },
    cleanedTranscript: {
      type: String,
      trim: true,
    },

    // Segments for seeking
    segments: [
      {
        startTime: Number, // seconds
        endTime: Number,
        speaker: String,
        text: String,
        confidence: Number,
        _id: false,
      },
    ],

    // Processing info
    provider: {
      type: String,
      enum: ["openai-whisper", "azure-speech", "google-speech", "deepgram", "none"],
      default: "openai-whisper",
    },
    language: {
      type: String,
      default: "vi",
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Status
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "skipped"],
      default: "pending",
    },
    error: String,

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: Date,
  },
  { timestamps: true },
);

// Index for queries
TranscriptSchema.index({ meetingId: 1 });
TranscriptSchema.index({ createdAt: -1 });

const Transcript = mongoose.model("Transcript", TranscriptSchema);
module.exports = Transcript;
