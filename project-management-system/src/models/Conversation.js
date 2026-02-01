const mongoose = require("mongoose");
const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    name: { type: String, trim: true },

    type: {
      type: String,
      enum: ["DIRECT", "PROJECT", "TEAM"], 
      required: true,
    },

    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

       projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },
    
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
    },

    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ parts: 1 }); 
conversationSchema.index({ projectId: 1, teamId: 1 }); 

module.exports = mongoose.model("Conversation", conversationSchema);