import React, { useContext } from "react";
import { NavLink, useParams } from "react-router-dom";
import { ProjectContext } from "../../contexts/ProjectContext";

const ProjectSettingMenu = () => {
  const { projectKey } = useParams();
  const { projectData } = useContext(ProjectContext);

  const menuItems = [
    { path: "general", label: "General", icon: "settings" },
    { path: "members", label: "Members", icon: "group" },
    { path: "tasktype", label: "Task Type", icon: "task" },
    { path: "priority", label: "Priority", icon: "flag" },
    { path: "platform", label: "Platform", icon: "devices" },
    { path: "workflow", label: "Workflow", icon: "account_tree" },
  ];

  return (
    <div className="mb-8">
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-neutral-900 mb-2">
            <span className="material-symbols-outlined text-primary-600">settings</span>
            {projectData?.name || "Project"} Settings
          </h1>
          <p className="text-neutral-600">Configure project settings, members, and workflows</p>
        </div>
      </div>

      <nav className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={`/app/task-mgmt/projects/${projectKey}/settings/${item.path}`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300"
                }`
              }
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default ProjectSettingMenu;
