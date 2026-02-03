const mongoose = require("mongoose");
const { Schema } = mongoose;

const ProjectDocumentSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    public_id: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      enum: ["requirement", "api_spec", "db_design", "guide", "decision", "other"],
      default: "other",
    },
    version: {
      type: String,
      default: "v1",
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    sourceType: {
      type: String,
      enum: ["project", "task", "comment", "meeting"],
      default: "project",
      index: true,
    },
    parent: {
      taskId: { type: Schema.Types.ObjectId, ref: "Task" },
      taskKey: { type: String },
      taskName: { type: String },
      commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
      meetingId: { type: Schema.Types.ObjectId, ref: "Meeting" },
      meetingTitle: { type: String },
      _id: false,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sharedWith: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    mimeType: {
      type: String,
    },
    size: {
      type: Number,
    },
  },
  { timestamps: true },
);

ProjectDocumentSchema.index({ projectId: 1, category: 1, uploadedAt: -1 });
ProjectDocumentSchema.index({ projectId: 1, filename: "text" });
ProjectDocumentSchema.index({ projectId: 1, sourceType: 1, uploadedAt: -1 });

module.exports = mongoose.model("ProjectDocument", ProjectDocumentSchema);
