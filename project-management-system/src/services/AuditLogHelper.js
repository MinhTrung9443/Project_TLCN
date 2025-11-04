const AuditLog = require("../models/AuditLog");

/**
 * Ghi log hành động (tạo, sửa, xóa, ...)
 * @param {Object} params
 * @param {ObjectId} params.userId - ID người thực hiện
 * @param {string} params.action - Tên hành động (create_task, update_project, ...)
 * @param {string} params.tableName - Tên bảng (Task, Project, ...)
 * @param {ObjectId} [params.recordId] - ID bản ghi bị tác động
 * @param {Object} [params.oldData] - Dữ liệu cũ (nếu có)
 * @param {Object} [params.newData] - Dữ liệu mới (nếu có)
 */
async function logAction({ userId, action, tableName, recordId, oldData, newData }) {
  await AuditLog.create({
    userId,
    action,
    tableName,
    recordId,
    oldData,
    newData,
    createdAt: new Date(),
  });
}

module.exports = { logAction };
