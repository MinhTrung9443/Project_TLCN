import React from "react";
import { FaPlus } from "react-icons/fa";
import "../../styles/Setting/SettingMenu.css";

const SettingMenu = ({ activeTab, onTabChange, onCreate }) => {
  const menuItems = [
    { key: "TaskTypes", label: "Task Type", icon: "task" },
    { key: "Priorities", label: "Priority", icon: "flag" },
    { key: "Platforms", label: "Platform", icon: "devices" },
  ];

  const getButtonText = () => {
    switch (activeTab.toLowerCase()) {
      case "priorities":
        return "Create Priority";
      case "platforms":
        return "Create Platform";
      default:
        return "Create Task Type";
    }
  };

  const getActiveItem = () => {
    return menuItems.find((item) => activeTab.toLowerCase() === item.key.toLowerCase());
  };

  return (
    <div className="setting-menu-wrapper">
      <div className="setting-menu-header">
        <div className="header-info">
          <h1 className="page-title">
            <span className="material-symbols-outlined">settings</span>
            Project Settings
          </h1>
          <p className="page-subtitle">Manage task types, priorities, and platforms for your project</p>
        </div>
        {onCreate && (
          <button className="create-btn" onClick={onCreate}>
            <span className="material-symbols-outlined">add</span>
            {getButtonText()}
          </button>
        )}
      </div>

      <nav className="setting-tabs">
        {menuItems.map((item) => (
          <button
            key={item.key}
            className={`tab-item ${activeTab.toLowerCase() === item.key.toLowerCase() ? "active" : ""}`}
            onClick={() => onTabChange(item.key)}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="tab-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default SettingMenu;
