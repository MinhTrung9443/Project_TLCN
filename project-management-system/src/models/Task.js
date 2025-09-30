const mongoose = require("mongoose");
const { Schema } = mongoose;

// Task Schema
const taskSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    parentTaskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
    },
    sprintId: {
      type: Schema.Types.ObjectId,
      ref: "Sprint",
    },
    taskTypeId: {
      type: Schema.Types.ObjectId,
      ref: "TaskType",
      required: true,
    },
    priorityId: {
      type: Schema.Types.ObjectId,
      ref: "Priority",
      required: true,
    },
    platformId: {
      type: Schema.Types.ObjectId,
      ref: "Platform",
    },
    statusId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    storyPoints: {
      type: Number,
      min: 0,
      default: 0,
    },
    startDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    attachments: [
      {
        filename: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    linkedTasks: [
      {
        type: {
          type: String,
          enum: ["blocks", "is blocked by", "relates to"],
          required: true,
        },
        taskId: {
          type: Schema.Types.ObjectId,
          ref: "Task",
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Task", taskSchema);
