// src/components/layout/Layout.jsx

import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import Sidebar from "./Sidebar.jsx"; // 1. Import Sidebar
import "../../styles/layout/Layout.css"; // Import file CSS cho Layout
import { useAuth } from "../../contexts/AuthContext"; // Import useAuth

const Layout = () => {
  const { user } = useAuth();

  return (
    <div className="app-container">
      <Header />
      <div className="layout-body">
        {" "}
        {/* 2. Bọc Sidebar và Outlet trong một div */}
        {user && <Sidebar />} {/* 3. Hiển thị Sidebar nếu user tồn tại */}
        <main className="main-content">
          <Outlet />
          {!user && <Footer />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
