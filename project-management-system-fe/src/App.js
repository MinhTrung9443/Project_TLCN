import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./contexts/AuthContext";
import "./App.css";

import LoginPage from "./pages/Login"; // Giả sử đường dẫn này đúng
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import MyProfilePage from "./pages/MyProfile";
import ManageUser from "./pages/ManageUser/ManageUser";
import UserProfile from "./pages/ManageUser/UserProfile";
import GroupListPage from "./pages/GroupListPage";
import GroupMembersPage from "./pages/GroupMembersPage";
import SettingPage from "./pages/Setting/setting";
import ProjectsPage from './pages/ManageProject/ProjectsPage';
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ForgotPassword />} />
          {/* Các route còn lại - NẰM BÊN TRONG LAYOUT */}
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/my-profile" element={<MyProfilePage />} />
            <Route path="/Organization/User" element={<ManageUser />} />
            <Route path="/Organization/User/:userId" element={<UserProfile />}/>
            <Route path="/organization/group" element={<GroupListPage />} />
            <Route path="/settings" element={<SettingPage />} />
            <Route path="/organization/group/:groupId" element={<GroupMembersPage />} />

            <Route path="/projects" element={<ProjectsPage />} />
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
