// src/components/layout/Header.jsx

import React from "react";
import { Link } from "react-router-dom";
import "../../styles/layout/Header.css"; // File CSS của Header

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <h1>
          <Link className="header-title-link">
            Project Management System
          </Link>
        </h1>
        <nav>
          <Link to="/login" className="login-button">
            LOGIN
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;