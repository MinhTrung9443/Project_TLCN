const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ActionItemSchema = new Schema(
  {
    summaryId: {
      type: Schema.Types.ObjectId,
      ref: "Summary",
      required: true,
    },
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },

    // Normalize with Task model
    name: {
      type: String,
      required: true,
    },
    description: String,

    // Assignment - using assigneeId like Task model
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Task integration
    linkedTaskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
    },
    createTaskStatus: {
      type: String,
      enum: ["pending", "created", "failed"],
      default: "pending",
    },

    // Priority - simple enum string
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },

    // Status - reference to Status collection (like Task)
    // Note: If using string status, keep as enum. For now, using reference
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },

    dueDate: Date,
    startDate: Date,

    // Audit
    sourceType: {
      type: String,
      enum: ["ai_extracted", "manual_added"],
      default: "ai_extracted",
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
  },
  { timestamps: true },
);

// Index for queries
ActionItemSchema.index({ summaryId: 1 });
ActionItemSchema.index({ meetingId: 1 });
ActionItemSchema.index({ owner: 1 });
ActionItemSchema.index({ status: 1 });
ActionItemSchema.index({ dueDate: 1 });

const ActionItem = mongoose.model("ActionItem", ActionItemSchema);
module.exports = ActionItem;
