// src/components/layout/Layout.jsx

import React, { useState } from "react"; // 1. Thêm useState
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import Sidebar from "./Sidebar.jsx";
import "../../styles/layout/Layout.css";
import { useAuth } from "../../contexts/AuthContext";

const Layout = () => {
  const { user } = useAuth();
  // 2. Tạo state để quản lý trạng thái đóng/mở của sidebar
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 3. Tạo hàm để bật/tắt trạng thái
  const toggleSidebar = () => {
    setSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="app-container">
      <Header />
      <div className="layout-body">
        {user && (
          // 4. Truyền state và hàm toggle xuống cho Sidebar
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            toggleSidebar={toggleSidebar}
          />
        )}
        <main className="main-content">
          <Outlet />
          {!user && <Footer />}
        </main>
      </div>
    </div>
  );
};

export default Layout;