const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProjectReportSnapshotSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    projectKey: {
      type: String,
      required: true,
      index: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    isLatest: {
      type: Boolean,
      default: true,
      index: true,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    generationMode: {
      type: String,
      enum: ["manual", "auto"],
      default: "manual",
    },
    dataFingerprint: {
      type: String,
      required: true,
      index: true,
    },
    overallScore: {
      type: Number,
      default: null,
    },
    evaluation: {
      type: String,
      default: null,
    },
    confidence: {
      type: Number,
      default: null,
    },
    reportPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    generationDetails: {
      provider: String,
      model: String,
      promptVersion: String,
      durationMs: Number,
      _id: false,
    },
  },
  { timestamps: true },
);

ProjectReportSnapshotSchema.index({ projectId: 1, version: -1 }, { unique: true });
ProjectReportSnapshotSchema.index({ projectId: 1, isLatest: 1 });

const ProjectReportSnapshot = mongoose.model("ProjectReportSnapshot", ProjectReportSnapshotSchema);
module.exports = ProjectReportSnapshot;
