import React, { useContext, useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { ProjectContext } from "../../contexts/ProjectContext";
import { useAuth } from "../../contexts/AuthContext";
import { getProjects } from "../../services/projectService";

export const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { user } = useAuth();
  const { selectedProjectKey } = useContext(ProjectContext);
  const [canViewAuditLog, setCanViewAuditLog] = useState(false);

  // Giả sử chiều cao Header của bạn là khoảng 64px.
  // Nếu Header cao hơn, hãy chỉnh số 64 thành số tương ứng (ví dụ 70 hoặc 80).
  const SIDEBAR_HEIGHT = "calc(100vh - 64px)";

  const getProjectPath = (path) => {
    if (!selectedProjectKey) return "#";
    // Đã chỉnh lại theo router bạn cung cấp
    return `/app/task-mgmt/projects/${selectedProjectKey}/${path}`;
  };

  useEffect(() => {
    if (!user) {
      setCanViewAuditLog(false);
      return;
    }
    if (user.role === "admin") {
      setCanViewAuditLog(true);
      return;
    }
    getProjects()
      .then((res) => {
        const projects = res.data || [];
        const hasPermission = projects.some((project) => {
          const isPM = project.members?.some(
            (member) => (member.userId._id === user._id || member.userId === user._id) && member.role === "PROJECT_MANAGER",
          );
          const isLeader = project.teams?.some((team) => team.leaderId._id === user._id || team.leaderId === user._id);
          return isPM || isLeader;
        });
        setCanViewAuditLog(hasPermission);
      })
      .catch(() => {
        setCanViewAuditLog(false);
      });
  }, [user]);

  return (
    // --- CONTAINER CHÍNH ---
    <div
      id="webcrumbs"
      className={`
        relative 
        flex flex-col 
        bg-white border-r shadow-md
        shrink-0 flex-shrink-0       /* CẤM CO LẠI */
        transition-all duration-300 ease-in-out
        /* QUAN TRỌNG: Kết hợp w (width) và min-w (min-width) để cố định kích thước */
        ${isCollapsed ? "w-20 min-w-[5rem]" : "w-64 min-w-[16rem]"}
      `}
      // Set chiều cao bằng màn hình trừ đi header để không bị lửng lơ
      style={{
        height: SIDEBAR_HEIGHT,
        minHeight: SIDEBAR_HEIGHT,
        zIndex: 40,
      }}
    >
      {/* 
         ĐÃ XÓA: paddingTop: "80px" ở đây. 
         Vì sidebar nằm dưới Header, không cần padding này nữa, nó gây ra khoảng trắng.
      */}
      <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <nav className="space-y-1">
          {/* Hide Dashboard for admin users */}
          {user?.role !== "admin" && (
            <NavLink
              to="/app/dashboard"
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm rounded-md transition-colors ${
                  isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                }`
              }
            >
              <span className="material-symbols-outlined mr-3 text-gray-500">dashboard</span>
              {/* Thêm whitespace-nowrap để chữ không bao giờ xuống dòng */}
              {!isCollapsed && <span className="whitespace-nowrap">Dashboard</span>}
            </NavLink>
          )}

          {/* --- Task Management Section --- */}
          <details className="group" open>
            <summary className="flex items-center justify-between px-3 py-2.5 text-sm rounded-md hover:bg-gray-100 transition-colors cursor-pointer select-none">
              <div className="flex items-center overflow-hidden">
                <span className="material-symbols-outlined mr-3 text-gray-500 shrink-0">computer</span>
                {!isCollapsed && <span className="whitespace-nowrap">Task Management</span>}
              </div>
              {!isCollapsed && (
                <span className="material-symbols-outlined text-gray-500 transform group-open:rotate-180 transition-transform">expand_more</span>
              )}
            </summary>

            {!isCollapsed && (
              <div className="pl-10 mt-1 space-y-1">
                {/* === NHÓM 1: LUÔN HIỂN THỊ (Projects, Gantt, Task Finder) === */}
                <NavLink
                  to="/app/projects"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-gray-500">bar_chart</span>
                  <span className="whitespace-nowrap">Projects</span>
                </NavLink>

                <NavLink
                  to="/app/gantt"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-gray-500">calendar_month</span>
                  <span className="whitespace-nowrap">Gantt</span>
                </NavLink>

                <NavLink
                  to="/app/task-finder"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-gray-500">description</span>
                  <span className="whitespace-nowrap">Task Finder</span>
                </NavLink>

                {/* === NHÓM 2: CHỈ HIỂN THỊ KHI ĐÃ CHỌN PROJECT === */}
                {selectedProjectKey && (
                  <>
                    <NavLink
                      to={getProjectPath("backlog")}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                          isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                        }`
                      }
                    >
                      <span className="material-symbols-outlined mr-3 text-gray-500">checklist</span>
                      <span className="whitespace-nowrap text-ellipsis overflow-hidden">
                        Backlog <span className="text-xs text-gray-400">({selectedProjectKey})</span>
                      </span>
                    </NavLink>

                    <NavLink
                      to={getProjectPath("active-sprint")}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                          isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                        }`
                      }
                    >
                      <span className="material-symbols-outlined mr-3 text-gray-500">view_kanban</span>
                      <span className="whitespace-nowrap text-ellipsis overflow-hidden">
                        Active Sprint <span className="text-xs text-gray-400">({selectedProjectKey})</span>
                      </span>
                    </NavLink>

                    <NavLink
                      to={getProjectPath("settings/general")}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                          isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                        }`
                      }
                    >
                      <span className="material-symbols-outlined mr-3 text-gray-500">settings</span>
                      <span className="whitespace-nowrap text-ellipsis overflow-hidden">
                        Project Settings <span className="text-xs text-gray-400">({selectedProjectKey})</span>
                      </span>
                    </NavLink>
                  </>
                )}
              </div>
            )}
          </details>

          {/* --- Organization Section --- */}
          <details className="group">
            <summary className="flex items-center justify-between px-3 py-2.5 text-sm rounded-md transition-colors cursor-pointer hover:bg-gray-100 select-none">
              <div className="flex items-center overflow-hidden">
                <span className="material-symbols-outlined mr-3 text-gray-500 shrink-0">apartment</span>
                {!isCollapsed && <span className="whitespace-nowrap">Organization</span>}
              </div>
              {!isCollapsed && (
                <span className="material-symbols-outlined text-gray-500 transform group-open:rotate-180 transition-transform">expand_more</span>
              )}
            </summary>
            {!isCollapsed && (
              <div className="pl-10 mt-1 space-y-1">
                <NavLink
                  to="/app/Organization/group"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-gray-500">group</span>
                  <span className="whitespace-nowrap">Group</span>
                </NavLink>
                <NavLink
                  to="/app/Organization/user"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-gray-500">person</span>
                  <span className="whitespace-nowrap">User</span>
                </NavLink>
              </div>
            )}
          </details>

          {/* --- Other Links --- */}
          {canViewAuditLog && (
            <NavLink
              to="/app/audit-log"
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm rounded-md transition-colors ${
                  isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                }`
              }
            >
              <span className="material-symbols-outlined mr-3 text-gray-500">receipt_long</span>
              {!isCollapsed && <span className="whitespace-nowrap">Audit Log</span>}
            </NavLink>
          )}
          {user.role === "admin" && (
            <NavLink
              to="/app/settings/TaskTypes"
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm rounded-md transition-colors ${
                  isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                }`
              }
            >
              <span className="material-symbols-outlined mr-3 text-gray-500">settings</span>
              {!isCollapsed && <span className="whitespace-nowrap">Settings</span>}
            </NavLink>
          )}
        </nav>
      </div>

      {/* Button Toggle Sidebar */}
      <button
        onClick={toggleSidebar}
        className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 focus:outline-none shadow-sm z-50"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="material-symbols-outlined text-base">{isCollapsed ? "chevron_right" : "chevron_left"}</span>
      </button>
    </div>
  );
};

export default Sidebar;
