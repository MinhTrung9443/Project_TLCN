const mongoose = require("mongoose");
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    // Hỗ trợ lưu thông tin file đính kèm
    attachments: [
      {
        url: String, 
        type: { type: String, enum: ["image", "video", "raw", "audio"] },
        name: String,
        publicId: String,
      },
    ],
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", messageSchema);