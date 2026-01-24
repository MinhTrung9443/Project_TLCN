import React, { useContext } from "react";
import { NavLink, useParams } from "react-router-dom";
import { ProjectContext } from "../../contexts/ProjectContext";
import "../../styles/Setting/SettingMenu.css";

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
    <div className="setting-menu-wrapper">
      <div className="setting-menu-header">
        <div className="header-info">
          <h1 className="page-title">
            <span className="material-symbols-outlined">settings</span>
            {projectData?.name || "Project"} Settings
          </h1>
          <p className="page-subtitle">Configure project settings, members, and workflows</p>
        </div>
      </div>

      <nav className="setting-tabs">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={`/app/task-mgmt/projects/${projectKey}/settings/${item.path}`}
            className={({ isActive }) => `tab-item ${isActive ? "active" : ""}`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="tab-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default ProjectSettingMenu;
