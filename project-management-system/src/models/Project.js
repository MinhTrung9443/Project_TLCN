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
    members: [ // Đây là nguồn chân lý duy nhất cho quyền trong dự án
      {
        _id: false,
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: {
          type: String,
          enum: ["PROJECT_MANAGER", "LEADER", "MEMBER"],
          required: true,
        },
      },
    ],
    teams: [
      {
          _id: false,
          teamId: { type: Schema.Types.ObjectId, ref: "Group", required: true }, // Tham chiếu đến Group model
          leaderId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Ai là Leader của team này TRONG DỰ ÁN NÀY
          members: [{
              type: Schema.Types.ObjectId,
              ref: "User"
          }]
      }
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
