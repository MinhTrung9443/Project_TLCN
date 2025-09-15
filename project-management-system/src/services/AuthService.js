const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const generateOTP = require("../utils/otpGenerator").default;
const sendOTP = require("../utils/sendOTP").default;

class AuthService {
  async login(email, password) {
    const user = await User.findOne({ email });
    console.log(user);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (user.status !== "active") {
      throw new Error("User account is inactive");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
    user.lastLogin = new Date();
    await user.save();

    return { user, token };
  }
  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Email not found");
    }

    const token = generateOTP();
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 300000; // 5 minutes
    await user.save();
    // try {
    await sendOTP({
      email: email,
      subject: "Your OTP code",
      template: "OTP",
      firstName: user.firstName,
      otp: token,
    });
    // } catch (error) {
    //   throw new Error("Error sending OTP");
    // }
  }

  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      throw new Error("Invalid or expired token");
    }
    console.log(newPassword);

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return user;
    } catch (error) {
      console.error("Error resetting password:", error);
      throw error;
    }
  }
}

module.exports = new AuthService();
