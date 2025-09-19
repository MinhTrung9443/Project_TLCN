const User = require("../models/User");

class UserService {
  /**
   * @param {string} userId - ID của user cần cập nhật.
   * @param {object} updateData - Dữ liệu mới cần cập nhật.
   * @returns {Promise<User>} - User đã được cập nhật.
   */
  async updateProfile(userId, updateData) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }
    const allowedUpdates = ["fullname", "avatar", "phone", "gender", "status"];
    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        user[key] = updateData[key];
      }
    });

    await user.save();
    return user;
  }
}

module.exports = new UserService();