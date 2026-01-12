const User = require("../models/User");
const Project = require("../models/Project");
const { logAction } = require("./AuditLogHelper");
const taskService = require("./TaskService");

class UserService {
  async updateProfile(userId, updateData, actorId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    const oldUser = user.toObject();

    // If trying to set status to inactive, ensure user can be deactivated
    if (updateData && updateData.status === "inactive") {
      await this.ensureCanDeactivateUser(userId);
      await taskService.removeAssigneeFromIncompleteTasks(userId);
    }

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

  async getAllUsers(page = 1, limit = 100) {
    // Nếu không có page và limit, chúng ta muốn lấy hết
    // Kiểm tra xem req.query có rỗng không
    const hasPagination = page && limit && !isNaN(page) && !isNaN(limit);

    if (hasPagination) {
      const skip = (page - 1) * limit;
      const users = await User.find({ status: "active" }).select("-password").skip(skip).limit(limit).populate("group", "name -_id").lean();
      // ... (trả về kết quả phân trang)
      return users; // Giả sử trả về mảng
    } else {
      // Nếu không có tham số phân trang, lấy TẤT CẢ user active
      const users = await User.find({ status: "active" }).select("-password").lean();
      return users;
    }
  }

  // Helper: ensure user can be deactivated (not PM or team leader in active projects)
  async ensureCanDeactivateUser(userId) {
    const uid = userId.toString();
    const projects = await Project.find({
      status: "active",
      isDeleted: false,
      $or: [{ members: { $elemMatch: { userId: userId, role: "PROJECT_MANAGER" } } }, { "teams.leaderId": userId }],
    }).lean();

    if (projects.length > 0) {
      const details = projects.map((p) => {
        const roles = [];
        if ((p.members || []).some((m) => m.userId && m.userId.toString && m.userId.toString() === uid && m.role === "PROJECT_MANAGER")) {
          roles.push("Project Manager");
        }
        if ((p.teams || []).some((t) => t.leaderId && t.leaderId.toString && t.leaderId.toString() === uid)) {
          roles.push("Team Leader");
        }
        return `${p.name} (${p.key || p._id}) - ${roles.join(" & ")}`;
      });

      const message = `This user currently holds the following roles: ${details.join(
        "; "
      )}. Please transfer these roles before deactivating the user.`;
      const err = new Error(message);
      err.statusCode = 400;
      throw err;
    }
  }

  async deleteUser(userId, actorId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Check active projects for roles
    await this.ensureCanDeactivateUser(userId);
    await taskService.removeAssigneeFromIncompleteTasks(userId);
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

    // If attempting to set status to inactive, check active projects
    if (updateData && updateData.status === "inactive") {
      await this.ensureCanDeactivateUser(userId);
      await taskService.removeAssigneeFromIncompleteTasks(userId);
    }

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
