// src/components/layout/Layout.jsx

import React from "react";
import { Outlet } from 'react-router-dom'; // 1. Import Outlet từ react-router-dom
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";

// 2. Bỏ prop { children } đi
const Layout = () => {
  return (
    <>
      <Header />
      <main>
        <Outlet /> {/* 3. Thay thế {children} bằng <Outlet /> */}
      </main>
      <Footer />
    </>
  );
};

export default Layout;