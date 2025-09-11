// src/App.js

import React from 'react';
// 1. Import thêm Routes và Route
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout'; 
// import AppRoutes from './routes/AppRoute'; // 2. Không cần file này nữa
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

// 3. Import trực tiếp các trang của bạn vào đây
import LoginPage from './pages/Login'; // Giả sử đường dẫn này đúng
import Dashboard from './pages/LandingPage'; // Ví dụ
// import các trang khác...

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* 4. Dùng <Routes> để định nghĩa các route */}
        <Routes>
          {/* Route cho login - NẰM NGOÀI LAYOUT */}
          <Route path="/login" element={<LoginPage />} />

          {/* Các route còn lại - NẰM BÊN TRONG LAYOUT */}
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} /> {/* Trang chủ */}
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Thêm các route khác cần header/footer ở đây */}
            {/* <Route path="/projects" element={<ProjectsPage />} /> */}
          </Route>
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;