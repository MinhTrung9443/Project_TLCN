const mongoose = require("mongoose");
const { Schema } = mongoose;

const aiChatMessageSchema = new Schema(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: "AIChatSession",
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AIChatMessage", aiChatMessageSchema);
