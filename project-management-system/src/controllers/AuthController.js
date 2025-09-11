const authService = require("../services/AuthService");

class AuthController {
  async login(req, res) {
    try {
      console.log("Request body:", req.body);
      const { email, password } = req.body;
      console.log("Login attempt for user:", email, password);
      const { user, token } = await authService.login(email, password);
      res.status(200).json({ user, token });
    } catch (error) {
      res.status(401).json({ message: error.message });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      res.status(200).json({ message: "Password reset link sent to email" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new AuthController();
