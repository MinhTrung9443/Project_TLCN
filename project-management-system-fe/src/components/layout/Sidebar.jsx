import React, { useContext, useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { ProjectContext } from "../../contexts/ProjectContext";
import "../../styles/layout/Sidebar.css";
import { useAuth } from "../../contexts/AuthContext";
import { getProjects } from "../../services/projectService";

export const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { user } = useAuth();
  const { selectedProjectKey } = useContext(ProjectContext);
  const [canViewAuditLog, setCanViewAuditLog] = useState(false);

  const getProjectPath = (path) => {
    if (!selectedProjectKey) return "#";
    return `/task-mgmt/projects/${selectedProjectKey}/${path}`;
  };

  // Check if user can view Audit Log (Admin, PM, or Leader)
  useEffect(() => {
    if (!user) {
      setCanViewAuditLog(false);
      return;
    }

    // Admin always can view
    if (user.role === "admin") {
      setCanViewAuditLog(true);
      return;
    }

    // Check if user is PM or Leader of any project
    getProjects()
      .then((res) => {
        const projects = res.data || [];

        const hasPermission = projects.some((project) => {
          // Check if PM
          const isPM = project.members?.some(
            (member) => (member.userId._id === user._id || member.userId === user._id) && member.role === "PROJECT_MANAGER"
          );

          // Check if Leader
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
    // BƯỚC 1: Thêm class `relative` vào container cha để định vị cho nút bấm mới
    <div id="webcrumbs" className="relative">
      <div
        className={`sidebar h-screen bg-white border-r shadow-md flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden" style={{ paddingTop: "80px" }}>
          {/* Navigation (giữ nguyên như cũ) */}
          <nav className="space-y-1">
            {/* Ẩn Dashboard nếu là admin */}
            {user.role !== "admin" && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 text-sm rounded-md transition-colors ${
                    isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                  }`
                }
              >
                <span className="material-symbols-outlined mr-3 text-gray-500">dashboard</span>
                {!isCollapsed && <span className="whitespace-nowrap">Dashboard</span>}
              </NavLink>
            )}

            {/* --- Task Management Section --- */}
            <details className="group" open>
              <summary className="flex items-center justify-between px-3 py-2.5 text-sm rounded-md hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-center">
                  <span className="material-symbols-outlined mr-3 text-gray-500">computer</span>
                  {!isCollapsed && <span className="whitespace-nowrap">Task Management</span>}
                </div>
                {!isCollapsed && (
                  <span className="material-symbols-outlined text-gray-500 transform group-open:rotate-180 transition-transform">expand_more</span>
                )}
              </summary>
              {!isCollapsed && (
                <div className="pl-10 mt-1 space-y-1">
                  {/* ... các NavLink con ... */}
                  <NavLink
                    to="/projects"
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
                    to="/gantt"
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
                    to="/task-finder"
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                        isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                      }`
                    }
                  >
                    <span className="material-symbols-outlined mr-3 text-gray-500">description</span>
                    <span className="whitespace-nowrap">Task Finder</span>
                  </NavLink>
                  <NavLink
                    to={getProjectPath("backlog")}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                        isActive ? "bg-gray-100 text-primary-500 font-semibold" : "hover:bg-gray-100"
                      }`
                    }
                  >
                    <span className="material-symbols-outlined mr-3 text-gray-500">checklist</span>
                    <span className="whitespace-nowrap">Backlog {selectedProjectKey && `(${selectedProjectKey})`}</span>
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
                    <span className="whitespace-nowrap">Active Sprint {selectedProjectKey && `(${selectedProjectKey})`}</span>
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
                    <span className="whitespace-nowrap">Project Settings {selectedProjectKey && `(${selectedProjectKey})`}</span>
                  </NavLink>
                </div>
              )}
            </details>

            {/* --- Organization Section --- */}
            <details className="group">
              <summary className="flex items-center justify-between px-3 py-2.5 text-sm rounded-md transition-colors cursor-pointer hover:bg-gray-100">
                <div className="flex items-center">
                  <span className="material-symbols-outlined mr-3 text-gray-500">apartment</span>
                  {!isCollapsed && <span className="whitespace-nowrap">Organization</span>}
                </div>
                {!isCollapsed && (
                  <span className="material-symbols-outlined text-gray-500 transform group-open:rotate-180 transition-transform">expand_more</span>
                )}
              </summary>
              {!isCollapsed && (
                <div className="pl-10 mt-1 space-y-1">
                  <NavLink
                    to="/Organization/group"
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
                    to="/Organization/user"
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
                to="/audit-log"
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
                to="/settings/TaskTypes"
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

        {/* BƯỚC 2: Xóa bỏ hoàn toàn nút bấm cũ ở dưới cùng */}
        {/* <div className="border-t p-2">...</div> */}
      </div>

      {/* BƯỚC 3: Thêm nút bấm mới, hiện đại, nằm bên ngoài sidebar */}
      <button
        onClick={toggleSidebar}
        className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 focus:outline-none z-10"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="material-symbols-outlined text-base">{isCollapsed ? "chevron_right" : "chevron_left"}</span>
      </button>
    </div>
  );
};

export default Sidebar;
