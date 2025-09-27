import React, { useContext }  from "react";
import { NavLink } from "react-router-dom";
import { ProjectContext } from "../../contexts/ProjectContext";
import "../../styles/layout/Sidebar.css";

export const Sidebar = () => {
   const { selectedProjectKey } = useContext(ProjectContext);

    const getProjectPath = (path) => {
        if (!selectedProjectKey) return "#"; 
        return `/task-mgmt/projects/${selectedProjectKey}/${path}`;
    };

  return (
    <div id="webcrumbs">
      <div className="sidebar w-64 h-screen bg-white border-r shadow-md flex flex-col">
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-8 w-8 bg-primary-500 rounded-md flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">
                dashboard
              </span>
            </div>
            <h2 className="text-lg font-semibold">AppDash</h2>
          </div>

          <nav className="space-y-1">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm rounded-md transition-colors ${
                  isActive
                    ? "bg-gray-100 text-primary-500 font-semibold"
                    : "hover:bg-gray-100"
                }`
              }
            >
              <span className="material-symbols-outlined mr-3 text-gray-500">
                dashboard
              </span>
              <span>Dashboard</span>
            </NavLink>

            <details className="group" closed>
              <summary className="flex items-center justify-between px-3 py-2.5 text-sm rounded-md hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-center">
                  <span className="material-symbols-outlined mr-3 text-gray-500">
                    computer
                  </span>
                  <span>Task Management</span>
                </div>
                <span className="material-symbols-outlined text-gray-500 transform group-open:rotate-180 transition-transform">
                  expand_more
                </span>
              </summary>

              <div className="pl-10 mt-1 space-y-1">
                <NavLink
                  to="/projects"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive
                        ? "bg-gray-100 text-primary-500 font-semibold"
                        : "hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-gray-500">
                    bar_chart
                  </span>
                  <span>Projects</span>
                </NavLink>

                <NavLink
                  to={getProjectPath("task-finder")}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive
                        ? "bg-gray-100 text-primary-500 font-semibold"
                        : "hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-gray-500">
                    description
                  </span>
                  <span>Task Finder {selectedProjectKey && `(${selectedProjectKey})`}</span>
                </NavLink>

                <NavLink
                  to={getProjectPath("gantt")}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive
                        ? "bg-gray-100 text-primary-500 font-semibold"
                        : "hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-gray-500">
                    calendar_month
                  </span>
                  <span>Gantt {selectedProjectKey && `(${selectedProjectKey})`}</span>
                </NavLink>

                <NavLink
                  to={getProjectPath("backlog")}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive
                        ? "bg-gray-100 text-primary-500 font-semibold"
                        : "hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-gray-500">
                    checklist
                  </span>
                  <span>Backlog {selectedProjectKey && `(${selectedProjectKey})`}</span>
                </NavLink>

                <NavLink
                  to={getProjectPath("active-sprint")}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive
                        ? "bg-gray-100 text-primary-500 font-semibold"
                        : "hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-gray-500">
                    view_kanban
                  </span>
                  <span>Active Sprint {selectedProjectKey && `(${selectedProjectKey})`}</span>
                </NavLink>

                <NavLink
                  to={getProjectPath("settings/general")}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive
                        ? "bg-gray-100 text-primary-500 font-semibold"
                        : "hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-gray-500">
                    settings
                  </span>
                  <span>Project Settings {selectedProjectKey && `(${selectedProjectKey})`}</span>
                </NavLink>
              </div>
            </details>

            <details className="group" closed>
              <summary className="flex items-center justify-between px-3 py-2.5 text-sm rounded-md transition-colors cursor-pointer">
                <div className="flex items-center">
                  <span className="material-symbols-outlined mr-3 text-gray-500">
                    apartment
                  </span>
                  <span>Organization</span>
                </div>
                <span className="material-symbols-outlined text-gray-500 transform group-open:rotate-180 transition-transform">
                  expand_more
                </span>
              </summary>

              <div className="pl-10 mt-1 space-y-1">
                <NavLink
                  to="/Organization/group"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive
                        ? "bg-gray-100 text-primary-500 font-semibold"
                        : "hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-gray-500">
                    group
                  </span>
                  <span>Group</span>
                </NavLink>

                <NavLink
                  to="/Organization/user"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive
                        ? "bg-gray-100 text-primary-500 font-semibold"
                        : "hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3 text-gray-500">
                    person
                  </span>
                  <span>User</span>
                </NavLink>
              </div>
            </details>

            <NavLink
              to="/audit-log"
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm rounded-md transition-colors ${
                  isActive
                    ? "bg-gray-100 text-primary-500 font-semibold"
                    : "hover:bg-gray-100"
                }`
              }
            >
              <span className="material-symbols-outlined mr-3 text-gray-500">
                receipt_long
              </span>
              <span>Audit Log</span>
            </NavLink>

            <NavLink
              to="/settings/TaskTypes"
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm rounded-md transition-colors ${
                  isActive
                    ? "bg-gray-100 text-primary-500 font-semibold"
                    : "hover:bg-gray-100"
                }`
              }
            >
              <span className="material-symbols-outlined mr-3 text-gray-500">
                settings
              </span>
              <span>Settings</span>
            </NavLink>
          </nav>
        </div>
      </div>
    </div>
  );
};
export default Sidebar;
