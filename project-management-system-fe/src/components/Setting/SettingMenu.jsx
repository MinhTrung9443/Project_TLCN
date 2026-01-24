import React from "react";
import "../../styles/Setting/SettingMenu.css";

const SettingMenu = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { key: "tasktypes", label: "Task Types", icon: "task_alt" },
    { key: "priorities", label: "Priorities", icon: "flag" },
    { key: "platforms", label: "Platforms", icon: "devices" },
  ];

  return (
    <div className="setting-menu-wrapper">
      <nav className="setting-tabs-nav">
        {menuItems.map((item) => (
          <button
            key={item.key}
            className={`tab-nav-item ${activeTab.toLowerCase() === item.key.toLowerCase() ? "active" : ""}`}
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
