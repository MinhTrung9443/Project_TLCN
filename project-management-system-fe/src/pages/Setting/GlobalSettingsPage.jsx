import React from "react";
import { useParams, useNavigate } from "react-router-dom";

// Import các component con cho từng tab
import SettingsTaskTypes from "./TaskType";
import SettingsPriorities from "./Priority";
import SettingsPlatforms from "./Platform";

// Import Menu Tab
import SettingMenu from "../../components/Setting/SettingMenu";
import "./GlobalSettingsPage.css";

const GlobalSettingsPage = () => {
  const { tabName = "tasktypes" } = useParams(); // Mặc định là 'tasktypes'
  const navigate = useNavigate();

  const handleTabChange = (newTab) => {
    navigate(`/settings/${newTab.toLowerCase()}`);
  };

  // Hàm render nội dung dựa vào `tabName`
  const renderTabContent = () => {
    switch (tabName.toLowerCase()) {
      case "priorities":
        return <SettingsPriorities />;
      case "platforms":
        return <SettingsPlatforms />;
      case "tasktypes":
      default:
        return <SettingsTaskTypes />;
    }
  };

  return (
    <div className="global-settings-container">
      <SettingMenu activeTab={tabName} onTabChange={handleTabChange} />
      <div className="settings-content-area">{renderTabContent()}</div>
    </div>
  );
};

export default GlobalSettingsPage;
