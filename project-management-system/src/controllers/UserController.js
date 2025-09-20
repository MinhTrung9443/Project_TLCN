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
  };
  async getUsers(req, res) {
    try {
      const filters = req.query;
      const users = await userService.getAllUsers(filters);
      res.status(200).json({
        message: 'Users fetched successfully',
        data: users,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
}

module.exports = new UserController();