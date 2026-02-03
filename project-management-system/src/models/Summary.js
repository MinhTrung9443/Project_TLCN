const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SummarySchema = new Schema(
  {
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    transcriptId: {
      type: Schema.Types.ObjectId,
      ref: "Transcript",
      required: true,
    },

    // Version management
    version: {
      type: Number,
      required: true,
    },
    isLatest: {
      type: Boolean,
      default: true,
    },
    reason: {
      type: String,
      enum: ["initial", "regenerated_by_pm", "retry"],
      default: "initial",
    },

    // Summary content
    overview: {
      type: String,
      default: "",
    },

    sections: [
      {
        title: String,
        content: String,
        keyPoints: [String],
        timeReference: Number, // seconds
        _id: false,
      },
    ],

    actionItems: [
      {
        type: Schema.Types.ObjectId,
        ref: "ActionItem",
      },
    ],

    decisions: [
      {
        title: String,
        context: String,
        timeReference: Number,
        _id: false,
      },
    ],

    risks: [
      {
        title: String,
        description: String,
        severity: {
          type: String,
          enum: ["high", "medium", "low"],
        },
        _id: false,
      },
    ],

    // Quality metrics
    quality: {
      transcriptConfidence: Number,
      summaryScore: Number, // 0-100
      tokenUsed: Number,
      generatedAt: Date,
      _id: false,
    },

    // Prompt & model info
    generationDetails: {
      provider: String, // openai-gpt4
      promptVersion: String, // v1, v2
      model: String,
      temperature: Number,
      _id: false,
    },

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Index for queries
SummarySchema.index({ meetingId: 1, version: -1 });
SummarySchema.index({ meetingId: 1, isLatest: 1 });
SummarySchema.index({ createdAt: -1 });

const Summary = mongoose.model("Summary", SummarySchema);
module.exports = Summary;
