import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import Sidebar from "./Sidebar.jsx";
import { useAuth } from "../../contexts/AuthContext";

const Layout = () => {
  const { user } = useAuth();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Header />

      <div className="flex flex-1">
        {user && <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={() => setSidebarCollapsed((prev) => !prev)} />}

        <main className={`flex-1 flex flex-col overflow-auto transition-all duration-300 ${user ? (isSidebarCollapsed ? "ml-20" : "ml-64") : ""}`}>
          <div className="flex-1">
            <Outlet />
          </div>
          {!user && <Footer />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
