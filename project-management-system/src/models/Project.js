const mongoose = require("mongoose");
const { Schema } = mongoose;

// Project Schema
const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Scrum", "Kanban"],
      required: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    parentProjectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },
    projectLeaderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workflowId: {
      type: Schema.Types.ObjectId,
      ref: "Workflow",
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
      required: true,
    },
    members: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          required: true,
        },
      },
    ],
    groups: [
      {
        type: Schema.Types.ObjectId,
        ref: "Group",
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Project", projectSchema);
