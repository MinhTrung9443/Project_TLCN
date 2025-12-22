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
      const users = await User.find().select("-password").skip(skip).limit(limit).populate("group", "name -_id").lean();
      // ... (trả về kết quả phân trang)
      return users; // Giả sử trả về mảng
    } else {
      // Nếu không có tham số phân trang, lấy TẤT CẢ user
      const users = await User.find().select("-password").lean();
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
    const sendOTP = require("../utils/sendOTP").default;
    const { username, email } = userData;
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      // Check which field is duplicate
      if (existingUser.username === username && existingUser.email === email) {
        throw new Error("Username and Email already exist");
      } else if (existingUser.username === username) {
        throw new Error("Username already exists");
      } else {
        throw new Error("Email already exists");
      }
    }
    const newUser = new User(userData);
    await newUser.save();

    // Gửi email thông báo tạo tài khoản
    try {
      await sendOTP({
        email: newUser.email,
        subject: "Your account has been created",
        template: "AccountCreated",
        firstName: newUser.fullname,
        username: newUser.email,
        password: userData.password,
        loginUrl: process.env.CLIENT_URL || "http://localhost:3000/login",
      });
    } catch (emailErr) {
      console.error("Failed to send account created email:", emailErr);
      // Không rollback tạo user nếu email thất bại, chỉ log
    }

    newUser.password = undefined;
    return newUser;
  }
}

module.exports = new UserService();
