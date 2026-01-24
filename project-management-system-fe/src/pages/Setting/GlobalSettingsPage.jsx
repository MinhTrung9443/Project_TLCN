import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import SettingsTaskTypes from "./TaskType";
import SettingsPriorities from "./Priority";
import SettingsPlatforms from "./Platform";
import SettingMenu from "../../components/Setting/SettingMenu";
import "../../styles/Setting/GlobalSettingsPage.css";

const GlobalSettingsPage = () => {
  const { tabName = "tasktypes" } = useParams();
  const navigate = useNavigate();

  const handleTabChange = (newTab) => {
    navigate(`/app/settings/${newTab.toLowerCase()}`);
  };

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
    <div className="global-settings-page">
      <div className="settings-hero-bg">
        <div className="settings-hero-shape"></div>
        <div className="settings-hero-content">
          <h1 className="settings-hero-title">Global Settings</h1>
          <p className="settings-hero-subtitle">Configure default task types, priorities, and platforms for your projects</p>
        </div>
      </div>

      <div className="settings-main-container">
        <SettingMenu activeTab={tabName} onTabChange={handleTabChange} />
        <div className="settings-content-wrapper">{renderTabContent()}</div>
      </div>
    </div>
  );
};

export default GlobalSettingsPage;
