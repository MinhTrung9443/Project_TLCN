const mongoose = require("mongoose");
const { Schema } = mongoose;

// Priority Schema
const prioritySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      required: true,
    },
    level: {
      type: Number,
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null, // null = cấu hình chung cho toàn hệ thống
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Priority", prioritySchema);
