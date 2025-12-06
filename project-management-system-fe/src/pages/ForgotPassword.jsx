import React from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/AuthService.js";
import { toast } from "react-toastify";

import "../styles/ForgotPassword.css";

// Không cần import logobg nữa vì nó được gọi trong CSS
import logo from "../assets/logo.png";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [isSentRequest, setIsSentRequest] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [repeatPassword, setRepeatPassword] = React.useState("");

  const handleForgotPassword = (event) => {
    event.preventDefault();
    const formData = {
      email: email,
    };

    if (!formData.email) {
      toast.error("Please enter your email");
      return;
    }

    authService
      .forgotPassword(formData)
      .then((response) => {
        toast.success("Password reset email sent successfully");
        setIsSentRequest(true);
      })
      .catch((error) => {
        console.error("Forgot password failed:", error);
        toast.error(error.response?.data?.message || "Forgot password failed");
      });
  };

  const handleResetPassword = (event) => {
    event.preventDefault();
    const formData = {
      token: otp,
      newPassword: newPassword,
    };
    if (newPassword !== repeatPassword) {
      toast.error("Passwords do not match");
      return;
    }

    authService
      .resetPassword(formData)
      .then((response) => {
        toast.success("Password reset successfully");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      })
      .catch((error) => {
        console.error("Reset password failed:", error);
        toast.error(error.response?.data?.message || "Reset password failed");
      });
  };

  return (
    <div className="forgot-password-page-container">
      {/* CỘT BÊN TRÁI (HÌNH ẢNH) - ĐÃ SỬA */}
      <div className="forgot-password-image-panel">{/* Phần này sẽ hiển thị ảnh nền được định nghĩa trong Login.css */}</div>

      {/* CỘT BÊN PHẢI (FORM) */}

      {isSentRequest === false ? (
        <div className="form-panel">
          <div className="form-content">
            <img src={logo} alt="Logo" className="logo" />
            <h2>Forgot Password</h2>
            <p className="subtitle">Please enter your email to reset your password.</p>

            <form onSubmit={handleForgotPassword}>
              <div className="input-group">
                <label>Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              <Link to="/login" className="login-link">
                Back to Login
              </Link>

              <button type="submit" className="btn-request-otp">
                Send OTP
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="form-panel">
          <div className="form-content">
            <img src={logo} alt="Logo" className="logo" />
            <h2>New Password</h2>
            <p className="subtitle">Check your email for the OTP to reset your password.</p>
            <form onSubmit={handleResetPassword}>
              <div className="input-group">
                <label>OTP</label>
                <input type="text" id="OTP" name="OTP" placeholder="Enter the OTP" required value={otp} onChange={(e) => setOtp(e.target.value)} />
              </div>

              <div className="input-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  placeholder="Enter your new password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="repeatPassword">Repeat Password</label>
                <input
                  type="password"
                  id="repeatPassword"
                  name="repeatPassword"
                  placeholder="Repeat your new password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-reset-password">
                Reset Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgotPasswordPage;
