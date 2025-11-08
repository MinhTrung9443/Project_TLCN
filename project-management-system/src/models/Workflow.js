const mongoose = require("mongoose");
const { Schema } = mongoose;

// Workflow Schema
const workflowSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    statuses: [
      {
        _id: {
          type: Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        category: {
          type: String,
          enum: ["To Do", "In Progress", "Done"],
          required: true,
        },
      },
    ],
    transitions: [
      {
        _id: {
          type: Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        from:
          {
            type: Schema.Types.ObjectId,
            required: true,
          },
        to: {
          type: Schema.Types.ObjectId,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Workflow", workflowSchema);
