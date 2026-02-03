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
      required: true,
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
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

module.exports = mongoose.model("ProjectDocument", ProjectDocumentSchema);
