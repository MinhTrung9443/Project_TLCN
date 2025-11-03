const mongoose = require("mongoose");
const { Schema } = mongoose;


const TaskHistorySchema = new Schema({
  taskId: { type: Schema.Types.ObjectId, required: true, ref: "Task" },
  userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  fieldName: { type: String, required: true },
  oldValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
  actionType: { type: String, required: true },
  createdAt: { type: Date, required: true, default: Date.now },
});
module.exports = mongoose.model("TaskHistory", TaskHistorySchema);
