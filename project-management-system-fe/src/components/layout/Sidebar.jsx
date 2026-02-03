import React, { useContext, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { ProjectContext } from "../../contexts/ProjectContext";
import { useAuth } from "../../contexts/AuthContext";
import { getProjects } from "../../services/projectService";

const navItemClass = ({ isActive }) =>
  `
  flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors duration-150 no-underline
  ${isActive ? "bg-blue-50 text-blue-600 font-medium" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"}
`;

export const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { user } = useAuth();
  const { selectedProjectKey } = useContext(ProjectContext);
  const [canViewAuditLog, setCanViewAuditLog] = useState(false);

  const getProjectPath = (path) => (selectedProjectKey ? `/app/task-mgmt/projects/${selectedProjectKey}/${path}` : "#");

  useEffect(() => {
    if (!user) return setCanViewAuditLog(false);
    if (user.role === "admin") return setCanViewAuditLog(true);

    getProjects()
      .then((res) => {
        const projects = res.data || [];
        const ok = projects.some(
          (p) =>
            p.members?.some((m) => (m.userId._id === user._id || m.userId === user._id) && m.role === "PROJECT_MANAGER") ||
            p.teams?.some((t) => t.leaderId._id === user._id || t.leaderId === user._id),
        );
        setCanViewAuditLog(ok);
      })
      .catch(() => setCanViewAuditLog(false));
  }, [user]);

  return (
    <aside
      className={`fixed top-16 left-0 h-[calc(100vh-64px)] bg-white border-r border-neutral-200 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
      style={{ zIndex: 40 }}
    >
      <div className="h-full flex flex-col">
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {user?.role !== "admin" && (
            <NavLink to="/app/dashboard" className={navItemClass}>
              <span className="material-symbols-outlined">dashboard</span>
              {!isCollapsed && <span>Dashboard</span>}
            </NavLink>
          )}

          <details open>
            <summary className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide cursor-pointer">
              <span className="material-symbols-outlined text-base">computer</span>
              {!isCollapsed && <span>Task Management</span>}
            </summary>

            {!isCollapsed && (
              <div className="mt-1 ml-6 space-y-1">
                <NavLink to="/app/projects" className={navItemClass}>
                  <span className="material-symbols-outlined">bar_chart</span>
                  <span>Projects</span>
                </NavLink>

                <NavLink to="/app/gantt" className={navItemClass}>
                  <span className="material-symbols-outlined">calendar_month</span>
                  <span>Gantt</span>
                </NavLink>

                <NavLink to="/app/task-finder" className={navItemClass}>
                  <span className="material-symbols-outlined">description</span>
                  <span>Task Finder</span>
                </NavLink>

                {selectedProjectKey && (
                  <>
                    <NavLink to={getProjectPath("backlog")} className={navItemClass}>
                      <span className="material-symbols-outlined">checklist</span>
                      <span className="flex items-center gap-1">
                        <span>Backlog</span>
                        <span className="text-xs text-neutral-400">({selectedProjectKey})</span>
                      </span>
                    </NavLink>

                    <NavLink to={getProjectPath("active-sprint")} className={navItemClass}>
                      <span className="material-symbols-outlined">view_kanban</span>
                      <span className="flex items-center gap-1">
                        <span>Active Sprint</span>
                        <span className="text-xs text-neutral-400">({selectedProjectKey})</span>
                      </span>
                    </NavLink>

                    <NavLink to={getProjectPath("meetings")} className={navItemClass}>
                      <span className="material-symbols-outlined">groups</span>
                      <span className="flex items-center gap-1">
                        <span>Meetings</span>
                        <span className="text-xs text-neutral-400">({selectedProjectKey})</span>
                      </span>
                    </NavLink>

                    <NavLink to={getProjectPath("docs")} className={navItemClass}>
                      <span className="material-symbols-outlined">description</span>
                      <span className="flex items-center gap-1">
                        <span>Documents</span>
                        <span className="text-xs text-neutral-400">({selectedProjectKey})</span>
                      </span>
                    </NavLink>

                    <NavLink to={getProjectPath("settings/general")} className={navItemClass}>
                      <span className="material-symbols-outlined">settings</span>
                      <span className="flex items-center gap-1">
                        <span>Project Settings</span>
                        <span className="text-xs text-neutral-400">({selectedProjectKey})</span>
                      </span>
                    </NavLink>
                  </>
                )}
              </div>
            )}
          </details>

          <details>
            <summary className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide cursor-pointer">
              <span className="material-symbols-outlined text-base">apartment</span>
              {!isCollapsed && <span>Organization</span>}
            </summary>

            {!isCollapsed && (
              <div className="mt-1 ml-6 space-y-1">
                <NavLink to="/app/Organization/group" className={navItemClass}>
                  <span className="material-symbols-outlined">group</span>
                  <span>Group</span>
                </NavLink>

                <NavLink to="/app/Organization/user" className={navItemClass}>
                  <span className="material-symbols-outlined">person</span>
                  <span>User</span>
                </NavLink>
              </div>
            )}
          </details>

          {canViewAuditLog && (
            <NavLink to="/app/audit-log" className={navItemClass}>
              <span className="material-symbols-outlined">receipt_long</span>
              {!isCollapsed && <span>Audit Log</span>}
            </NavLink>
          )}

          {user?.role === "admin" && (
            <NavLink to="/app/settings/TaskTypes" className={navItemClass}>
              <span className="material-symbols-outlined">settings</span>
              {!isCollapsed && <span>Settings</span>}
            </NavLink>
          )}
        </nav>

        <div className="p-2 border-t border-neutral-200">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center py-2 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition"
          >
            <span className="material-symbols-outlined">{isCollapsed ? "chevron_right" : "chevron_left"}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
