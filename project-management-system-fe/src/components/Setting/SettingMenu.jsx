import React from "react";

const SettingMenu = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { key: "tasktypes", label: "Task Types", icon: "task_alt" },
    { key: "priorities", label: "Priorities", icon: "flag" },
    { key: "platforms", label: "Platforms", icon: "devices" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 h-fit sticky top-24">
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.key}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab.toLowerCase() === item.key.toLowerCase() ? "bg-primary-100 text-primary-600" : "text-neutral-700 hover:bg-neutral-100"
            }`}
            onClick={() => onTabChange(item.key)}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default SettingMenu;
