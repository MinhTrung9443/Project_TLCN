const mongoose = require("mongoose");
const { Schema } = mongoose;

const AuditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  action: { type: String, required: true },
  tableName: { type: String },
  recordId: { type: Schema.Types.ObjectId },
  oldData: { type: Object },
  newData: { type: Object },
  createdAt: { type: Date, required: true, default: Date.now },
});

module.exports = mongoose.model("AuditLog", AuditLogSchema);
