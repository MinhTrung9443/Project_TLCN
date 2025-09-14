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
    const allowedUpdates = ["fullname", "avatar", "phone", "gender"];
    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        user[key] = updateData[key];
      }
    });

    await user.save();
    return user;
  }

  async getAllUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const users = await User.find().skip(skip).limit(limit);
    return users;
  }

  async deleteUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    user.status = "inactive";
    await user.save();
    return;
  }

  async updateUserInfo(userId, updateData) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const allowedUpdates = [
      "fullname",
      "avatar",
      "phone",
      "gender",
      "email",
      "username",
    ];
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
