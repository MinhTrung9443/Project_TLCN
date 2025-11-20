import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./contexts/AuthContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import "./App.css";
import PrivateRoute from "./routes/PrivateRoute"; // Đảm bảo đường dẫn này đúng
import AdminRoute from "./routes/AdminRoute"; // Chúng ta sẽ tạo file này sau
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
import ProjectSettingsGeneral from "./pages/ManageProject/ProjectSettingsGeneral";
import ProjectSettingMembers from "./pages/ManageProject/ProjectSettingMembers";
import ProjectSettingsWorkflow from "./pages/ManageProject/ProjectSettingsWorkflow";
import ProjectSettingPlatform from "./pages/ManageProject/ProjectSettingPlatform";
import ProjectSettingPriority from "./pages/ManageProject/ProjectSettingPriority";
import ProjectSettingTasktype from "./pages/ManageProject/ProjectSettingTasktype";
function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <BrowserRouter>
          <Routes>
            {/* === CÁC ROUTE CÔNG KHAI === */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* === CÁC ROUTE CẦN ĐĂNG NHẬP === */}
            <Route path="/" element={<PrivateRoute />}>
              <Route element={<Layout />}>
                
                {/* --- Các Route chung cho mọi User --- */}
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="my-profile" element={<MyProfilePage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="task-finder" element={<TaskFinderPage />} />
                <Route path="gantt" element={<GanttPage />} />
                  
                  {/* Route cho trang Settings và các tab con của nó */}
                <Route path="task-mgmt/projects/:projectKey/settings" element={<ProjectSettingsPage />}>
                    <Route index element={<ProjectSettingsGeneral />} />
                    <Route path="general" element={<ProjectSettingsGeneral />} />
                    <Route path="members" element={<ProjectSettingMembers />} />
                    <Route path="tasktype" element={<ProjectSettingTasktype />} />
                    <Route path="priority" element={<ProjectSettingPriority />} />
                    <Route path="platform" element={<ProjectSettingPlatform />} />
                    <Route path="workflow" element={<ProjectSettingsWorkflow />} />
                  </Route>

                  {/* Các route khác thuộc một project */}
                  <Route path="backlog" element={<BacklogPage />} />
                  <Route path="active-sprint" element={<ActiveSprintPage />} />

                  {/* Nếu Gantt Chart cũng thuộc một project, nó nên nằm ở đây */}
                  {/* <Route path="gantt" element={<GanttPage />} /> */}
                </Route>
                {/* --- CÁC ROUTE CHỈ DÀNH CHO ADMIN --- */}
                <Route path="organization">
                  <Route path="user" element={<AdminRoute><ManageUser /></AdminRoute>} />
                  <Route path="user/:userId" element={<AdminRoute><UserProfile /></AdminRoute>} />
                  <Route path="group" element={<AdminRoute><GroupListPage /></AdminRoute>} />
                  <Route path="group/:groupId" element={<AdminRoute><GroupMembersPage /></AdminRoute>} />
                </Route>
                <Route path="settings" element={<AdminRoute><GlobalSettingsPage /></AdminRoute>}>
                  {/* Route con cho các tab setting nếu có */}
                  <Route path=":tabName" element={<AdminRoute><GlobalSettingsPage /></AdminRoute>} />
                </Route>
                <Route path="audit-log" element={<AdminRoute><AdminAuditLogPage /></AdminRoute>} />

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
        </BrowserRouter>
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App;