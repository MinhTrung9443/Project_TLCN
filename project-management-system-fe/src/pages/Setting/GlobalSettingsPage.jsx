import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import SettingsTaskTypes from "./TaskType";
import SettingsPriorities from "./Priority";
import SettingsPlatforms from "./Platform";
import SettingMenu from "../../components/Setting/SettingMenu";

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="relative bg-gradient-to-r from-purple-600 to-purple-700 p-12 mb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full opacity-10 -mr-32 -mt-32"></div>
        <div className="relative max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">Global Settings</h1>
          <p className="text-purple-100">Configure default task types, priorities, and platforms for your projects</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-1">
            <SettingMenu activeTab={tabName} onTabChange={handleTabChange} />
          </div>
          <div className="lg:col-span-4">{renderTabContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSettingsPage;
