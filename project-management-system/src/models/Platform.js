const mongoose = require("mongoose");
const { Schema } = mongoose;

// Platform Schema
const platformSchema = new Schema(
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
    description: {
      type: String,
      trim: true,
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

module.exports = mongoose.model("Platform", platformSchema);
