const User = require("../models/User");
const { logAction } = require("./AuditLogHelper");

class UserService {
  async updateProfile(userId, updateData, actorId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    const oldUser = user.toObject();

    const allowedUpdates = ["fullname", "avatar", "phone", "gender", "status"];
    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        user[key] = updateData[key];
      }
    });

    await user.save();
    await logAction({
      userId: actorId,
      action: "update_user_profile",
      tableName: "User",
      recordId: user._id,
      oldData: oldUser,
      newData: user,
    });
    return user;
  }
  async getUsers(filters = {}) {
    try {
      const users = await User.find(filters).select("-password");
      return users;
    } catch (error) {
      throw createError(500, "Error fetching users from database");
    }
  }

   async getAllUsers(page = 1, limit = 20) {
    // Nếu không có page và limit, chúng ta muốn lấy hết
    // Kiểm tra xem req.query có rỗng không
    const hasPagination = page && limit && !isNaN(page) && !isNaN(limit);

    if (hasPagination) {
        const skip = (page - 1) * limit;
        const users = await User.find()
            .select('-password')
            .skip(skip)
            .limit(limit)
            .populate("group", "name -_id")
            .lean();
        // ... (trả về kết quả phân trang)
        return users; // Giả sử trả về mảng
    } else {
        // Nếu không có tham số phân trang, lấy TẤT CẢ user
        const users = await User.find().select('-password').lean();
        return users;
    }
  }

  async deleteUser(userId, actorId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    const oldUser = user.toObject();
    user.status = "inactive";
    await user.save();
    await logAction({
      userId: actorId,
      action: "delete_user",
      tableName: "User",
      recordId: user._id,
      oldData: oldUser,
    });
    return;
  }

  async updateUserInfo(userId, updateData, actorId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    const oldUser = user.toObject();

    const allowedUpdates = ["fullname", "avatar", "phone", "gender", "status"];
    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        user[key] = updateData[key];
      }
    });
    await user.save();
    await logAction({
      userId: actorId,
      action: "update_user_info",
      tableName: "User",
      recordId: user._id,
      oldData: oldUser,
      newData: user,
    });
    return user;
  }

  async getUserById(userId) {
    const user = await User.findById(userId).populate("group", "name -_id").lean();

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
