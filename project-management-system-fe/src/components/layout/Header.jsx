// src/components/layout/Header.jsx

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/layout/Header.css";

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  console.log("Header rendering with auth state:", { isAuthenticated, user });
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate("/login");
  };

  function getAvatarInitial(name) {
  // Kiểm tra xem 'name' có phải là một chuỗi ký tự và có độ dài > 0 không
  if (typeof name === 'string' && name.length > 0) {
    return name.charAt(0).toUpperCase();
  }
  // Nếu không, trả về một giá trị mặc định để không bị crash
  return '?'; // hoặc return một icon mặc định
}

  const getAvatarUrl = () => {
    if (user && user.avatar) {
      return user.avatar;
    }
    return null;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <header className="header">
      <div className="header-content">
        <h1>
          <Link to="/" className="header-title-link">
            Project Management System
          </Link>
        </h1>
        <nav>
          {isAuthenticated ? (
            <div className="profile-menu" ref={dropdownRef}>
              <div
                className="avatar"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()}
                    alt="Avatar"
                    className="avatar-img"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  getAvatarInitial(user.fullname)
                )}
              </div>

              {dropdownOpen && user && (
                <div className="dropdown-content">
                  <div className="dropdown-user-info">
                    <strong>{user.fullname}</strong>
                    <span>{user.email}</span>
                  </div>
                  <Link to="/my-profile" onClick={() => setDropdownOpen(false)}>
                    My Profile
                  </Link>
                  <button onClick={handleLogout}>Log Out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="login-button">
              LOGIN
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
