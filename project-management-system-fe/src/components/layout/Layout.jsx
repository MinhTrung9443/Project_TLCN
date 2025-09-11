// src/components/layout/Layout.jsx

import React from "react";
import { Outlet } from 'react-router-dom'; 
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import Sidebar from "./Sidebar.jsx"; // 1. Import Sidebar
import '../../styles/layout/Layout.css'; // Import file CSS cho Layout

const Layout = () => {
  return (
    <div className="app-container">
      <Header />
      <div className="layout-body"> {/* 2. Bọc Sidebar và Outlet trong một div */}
        <Sidebar />
        <main className="main-content">
          <Outlet />  
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;