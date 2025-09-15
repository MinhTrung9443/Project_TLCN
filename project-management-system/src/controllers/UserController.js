const userService = require("../services/UserService");

class UserController {
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      const updatedUser = await userService.updateProfile(userId, updateData);

      updatedUser.password = undefined;

      res.status(200).json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getAllUsers(req, res) {
    try {
      const { page, limit } = req.query;
      const users = await userService.getAllUsers(page, limit);
      users.forEach((user) => (user.password = undefined));
      res.status(200).json(users);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteUser(req, res) {
    try {
      const userId = req.params.id;
      await userService.deleteUser(userId);
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async updateUserInfo(req, res) {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      const updatedUser = await userService.updateUserInfo(userId, updateData);
      updatedUser.password = undefined;
      res.status(200).json({
        message: "User information updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  getUserById(req, res) {
    try {
      const userId = req.params.id;
      const user = userService.getUserById(userId);
      user.password = undefined;
      res.status(200).json(user);
    } catch (error) {
      res.status(400).json({ message: error.message });
    } 
  }
}

module.exports = new UserController();
