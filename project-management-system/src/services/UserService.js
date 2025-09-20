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
    const users = await User.find()
      .skip(skip)
      .limit(limit)
      .populate("group", "name -_id")
      .lean();

    const result = users.map((u) => ({
      ...u,
      group: u.group.map((g) => g.name), // chỉ giữ lại tên
    }));
    return result;
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
    const allowedUpdates = ["fullname", "avatar", "phone", "gender", "status"];
    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        user[key] = updateData[key];
      }
    });
    await user.save();
    return user;
  }

  async getUserById(userId) {
    const user = await User.findById(userId)
      .populate("group", "name -_id")
      .lean();

    user.group = user.group.map((g) => g.name);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async addUser(userData) {
    const { username, email } = userData;
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      throw new Error("User already exists");
    }
    const newUser = new User(userData);
    await newUser.save();
    newUser.password = undefined;
    return newUser;
  }
}

module.exports = new UserService();
