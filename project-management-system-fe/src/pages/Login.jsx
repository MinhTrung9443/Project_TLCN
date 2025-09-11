import React from "react";
import { Link } from "react-router-dom";
import authService from "../services/AuthService.js";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";

import "./Login.css";

// Không cần import logobg nữa vì nó được gọi trong CSS
import logo from "../assets/logo.png";

const LoginPage = () => {
  const { login } = useAuth();

  const handleLogin = (event) => {
    event.preventDefault();
    const formData = {
      email: event.target.email.value,
      password: event.target.password.value,
    };

    authService
      .login(formData)
      .then((response) => {
        login(response.user, response.token);
        toast.success("Login successful");
      })
      .catch((error) => {
        console.error("Login failed:", error);
        toast.error(error.response?.data?.message || "Login failed");
      });
  };

  return (
    <div className="login-page-container">
      {/* CỘT BÊN TRÁI (HÌNH ẢNH) - ĐÃ SỬA */}
      <div className="login-image-panel">
        {/* Phần này sẽ hiển thị ảnh nền được định nghĩa trong Login.css */}
      </div>

      {/* CỘT BÊN PHẢI (FORM) */}
      <div className="login-form-panel">
        <div className="form-content">
          <img src={logo} alt="Logo" className="logo" />
          <h2>Sign in</h2>
          <p className="subtitle">Welcome back! Please enter your details.</p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your.email@example.com"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter password"
                required
              />
            </div>
            <Link to="/forgot-password" className="forgot-password">
              Forgot your password?
            </Link>

            <button type="submit" className="btn-signin">
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;