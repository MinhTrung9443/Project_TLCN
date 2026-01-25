import React from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/AuthService.js";
import { toast } from "react-toastify";

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
    <div className="min-h-screen bg-light flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm p-12">
          <div className="text-center mb-8">
            <img src={logo} alt="Logo" className="w-32 h-auto mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-blue-900 mb-2">{isSentRequest ? "New Password" : "Forgot Password"}</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              {isSentRequest ? "Check your email for the OTP to reset your password." : "Please enter your email to reset your password."}
            </p>
          </div>

          {isSentRequest === false ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div className="flex justify-end">
                <Link to="/login" className="text-purple-600 no-underline text-sm font-medium hover:text-purple-700 transition-colors">
                  Back to Login
                </Link>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                Send OTP
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  OTP <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="OTP"
                  placeholder="Enter the OTP"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  New Password <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="Enter your new password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Repeat Password <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  name="repeatPassword"
                  placeholder="Repeat your new password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                Reset Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
