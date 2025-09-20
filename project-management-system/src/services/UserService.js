const User = require("../models/User");

class UserService {
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
  };
 async getAllUsers(filters = {}) {
    try {
      const users = await User.find(filters).select('-password');
      return users;
    } catch (error) {
      throw createError(500, 'Error fetching users from database');
    }
  }
}
module.exports = new UserService();