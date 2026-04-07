import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import SettingsTaskTypes from "./TaskType";
import SettingsPriorities from "./Priority";
import SettingsPlatforms from "./Platform";
import SettingMenu from "../../components/Setting/SettingMenu";
import PageHeader from "../../components/ui/PageHeader";
import { VscSettingsGear } from "react-icons/vsc";

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
    <div className="space-y-6">
      <PageHeader
        icon={VscSettingsGear}
        title="Global Settings"
        description="Configure default task types, priorities, and platforms for your projects"
        badge="Admin"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-1">
          <SettingMenu activeTab={tabName} onTabChange={handleTabChange} />
        </div>
        <div className="lg:col-span-4">{renderTabContent()}</div>
      </div>
    </div>
  );
};

export default GlobalSettingsPage;
