import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import Sidebar from "./Sidebar.jsx";
import { useAuth } from "../../contexts/AuthContext";

const Layout = () => {
  const { user } = useAuth();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex flex-col min-h-screen bg-light">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {user && <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />}
        <main className="flex-1 overflow-auto">
          <Outlet />
          {!user && <Footer />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
