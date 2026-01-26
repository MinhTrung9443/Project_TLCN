import React, { useContext } from "react";
import { NavLink, useParams } from "react-router-dom";
import { ProjectContext } from "../../contexts/ProjectContext";

const ProjectSettingMenu = () => {
  const { projectKey } = useParams();
  const { projectData } = useContext(ProjectContext);

  const menuItems = [
    { path: "general", label: "General", icon: "info", description: "Basic info" },
    { path: "members", label: "Members", icon: "group", description: "Team access" },
    { path: "tasktype", label: "Task Type", icon: "category", description: "Work categories" },
    { path: "priority", label: "Priority", icon: "flag", description: "Urgency levels" },
    { path: "platform", label: "Platform", icon: "devices_other", description: "Target platforms" },
    { path: "workflow", label: "Workflow", icon: "account_tree", description: "Status flow" },
  ];

  return (
    <nav className="p-3 space-y-1">
      {menuItems.map((item) => (
        <NavLink
          key={item.path}
          to={`/app/task-mgmt/projects/${projectKey}/settings/${item.path}`}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive ? "bg-primary-50 text-primary-700 shadow-sm" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
            }`
          }
        >
          <div
            className={({ isActive }) =>
              `w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? "bg-primary-100" : "bg-neutral-100"}`
            }
          >
            <span className="material-symbols-outlined text-lg">{item.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{item.label}</div>
            <div className="text-xs text-neutral-500">{item.description}</div>
          </div>
        </NavLink>
      ))}
    </nav>
  );
};

export default ProjectSettingMenu;
