const mongoose = require("mongoose");
const { Schema } = mongoose;

const pollOptionSchema = new Schema({
    text: { type: String, required: true },
    voters: [{ type: Schema.Types.ObjectId, ref: "User" }]
});

const pollSchema = new Schema({
    question: { type: String, required: true },
    options: [pollOptionSchema]
});

const linkPreviewSchema = new Schema({
    url: { type: String, required: true },
    title: String,
    description: String,
    image: String,
    siteName: String
});

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
    type: {
      type: String,
      enum: ["text", "poll", "giphy", "notification"],
      default: "text"
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
    poll: pollSchema,
    linkPreview: linkPreviewSchema,
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isRecalled: {
      type: Boolean,
      default: false,
    },
    replyTo: {
        type: Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
    reactions: [
        {
            userId: { type: Schema.Types.ObjectId, ref: "User" },
            type: { type: String }, // e.g., 'like', 'love', 'haha', 'wow', 'sad', 'angry'
        }
    ],
    poll: pollSchema,
    linkPreview: linkPreviewSchema
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", messageSchema);