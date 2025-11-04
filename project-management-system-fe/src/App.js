import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./contexts/AuthContext";
import { ProjectProvider } from "./contexts/ProjectContext";
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
import ProjectsPage from "./pages/ManageProject/ProjectsPage";
import ProjectSettingsPage from "./pages/ManageProject/ProjectSettingsPage.jsx";
import GlobalSettingsPage from "./pages/Setting/GlobalSettingsPage"; // <-- Import trang cha
import TaskFinderPage from "./pages/ManageTask/TaskFinderPage"; // <-- IMPORT
import BacklogPage from "./pages/ManageSprint/BacklogPage";
import ActiveSprintPage from "./pages/ManageSprint/ActiveSprintPage";
import GanttPage from "./pages/Gantt/GantPage.jsx";
import AdminAuditLogPage from "./pages/AuditLog/AdminAuditLogPage.jsx";

function App() {
  return (
    <ProjectProvider>
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
              <Route path="/Organization/User/:userId" element={<UserProfile />} />
              <Route path="/organization/group" element={<GroupListPage />} />

              <Route path="/settings/:tabName" element={<GlobalSettingsPage />} />
              <Route path="/settings" element={<GlobalSettingsPage />} />

              <Route path="/organization/group/:groupId" element={<GroupMembersPage />} />

              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/task-mgmt/projects/:projectKey/settings/:tabName" element={<ProjectSettingsPage />} />
              <Route path="/task-finder" element={<TaskFinderPage />} />
              <Route path="/task-mgmt/projects/:projectKey/backlog" element={<BacklogPage />} />
              <Route path="/task-mgmt/projects/:projectKey/active-sprint" element={<ActiveSprintPage />} />
              <Route path="/gantt" element={<GanttPage />} />
              <Route path="/audit-log" element={<AdminAuditLogPage />} />
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
    </ProjectProvider>
  );
}

export default App;
