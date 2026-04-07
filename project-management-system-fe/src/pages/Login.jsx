import React from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/AuthService.js";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";

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
        // Redirect admin to projects page instead of audit-log
        if (response.data.user.role === "admin") {
          navigate("/app/projects");
          return;
        }
        navigate("/app/dashboard");
      })
      .catch((error) => {
        console.error("Login failed:", error);
        toast.error(error.response?.data?.message || "Login failed");
      });
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm p-12">
          <div className="text-center mb-8">
            <img src={logo} alt="Logo" className="w-32 h-auto mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-blue-900 mb-2">Sign in</h2>
            <p className="text-lg text-neutral-600 leading-relaxed">Welcome back! Please enter your details.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-base font-semibold text-neutral-900 mb-2">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="your.email@example.com"
                required
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg text-base focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              />
            </div>

            <div>
              <label className="block text-base font-semibold text-neutral-900 mb-2">
                Password <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                name="password"
                placeholder="Enter password"
                required
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg text-base focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              />
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-primary-600 no-underline text-sm font-medium hover:text-primary-700 transition-colors">
                Forgot your password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-6 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
