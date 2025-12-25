import React from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/AuthService.js";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";

import "../styles/Login.css";

import logo from "../assets/logo.png";

const LoginPage = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (event) => {
    event.preventDefault();
    const formData = {
      email: event.target.email.value,
      password: event.target.password.value,
    };

    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    authService
      .login(formData)
      .then((response) => {
        login(response.data.user, response.data.token);
        toast.success("Login successful");
        if (user && user.role === "admin") {
          navigate("/audit-log");
          return;
        }
        navigate("/dashboard");
      })
      .catch((error) => {
        console.error("Login failed:", error);
        toast.error(error.response?.data?.message || "Login failed");
      });
  };

  return (
    <div className="login-page-container">
      <div className="login-image-panel"></div>
      <div className="login-form-panel">
        <div className="form-content">
          <img src={logo} alt="Logo" className="logo" />
          <h2>Sign in</h2>
          <p className="subtitle">Welcome back! Please enter your details.</p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="email">
                Email <span style={{ color: "red" }}>*</span>
              </label>
              <input type="email" id="email" name="email" placeholder="your.email@example.com" required />
            </div>
            <div className="input-group">
              <label htmlFor="password">
                Password <span style={{ color: "red" }}>*</span>
              </label>
              <input type="password" id="password" name="password" placeholder="Enter password" required />
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
