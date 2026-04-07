const mongoose = require("mongoose");
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  priority: { type: String, default: "LOW" },
  relatedId: { type: String },
  relatedType: { type: String },
  groupKey: { type: String, default: null, index: true },
  actorIds: { type: [Schema.Types.ObjectId], default: [] },
  actorNames: { type: [String], default: [] },
  actorCount: { type: Number, default: 0 },
  groupCount: { type: Number, default: 1 },
  latestActorName: { type: String, default: null },
  metadata: { type: Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, required: true, default: false },
  createdAt: { type: Date, required: true, default: Date.now },
});

module.exports = mongoose.model("Notification", NotificationSchema);
