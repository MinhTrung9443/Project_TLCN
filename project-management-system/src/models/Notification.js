const mongoose = require("mongoose");
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  relatedId: { type: Schema.Types.ObjectId },
  relatedType: { type: String },
  isRead: { type: Boolean, required: true, default: false },
  createdAt: { type: Date, required: true, default: Date.now },
});

module.exports = mongoose.model("Notification", NotificationSchema);
