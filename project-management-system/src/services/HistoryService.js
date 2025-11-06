const TaskHistory = require("../models/TaskHistory");
const User = require("../models/User"); // Cần để lấy tên field

const getDisplayValue = async (fieldName, value) => {
  if (!value) return "None";
  if (["assigneeId", "reporterId", "createdById"].includes(fieldName)) {
    const user = await User.findById(value).select("fullname").lean();
    return user ? user.fullname : value.toString();
  }

  return value.toString();
};

const logHistory = async (taskId, userId, fieldName, oldValue, newValue, actionType) => {
  try {
    // Để hiển thị đẹp hơn, bạn có thể lấy giá trị "thật" thay vì chỉ ID
    // const displayOldValue = await getDisplayValue(fieldName, oldValue);
    // const displayNewValue = await getDisplayValue(fieldName, newValue);

    const history = new TaskHistory({
      taskId,
      userId,
      fieldName,
      oldValue, // Lưu giá trị gốc (có thể là ID)
      newValue,
      actionType, // 'CREATE', 'UPDATE', 'COMMENT'
    });
    await history.save();
  } catch (error) {
    console.error("Failed to log history:", error);
  }
};

module.exports = { logHistory , getDisplayValue};