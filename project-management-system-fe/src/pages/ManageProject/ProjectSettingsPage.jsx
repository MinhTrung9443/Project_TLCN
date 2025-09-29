import { useParams } from "react-router-dom";

import ProjectSettingsGeneral from "./ProjectSettingsGeneral";
import ProjectSettingMembers from "./ProjectSettingMembers";
import ProjectSettingTaskType from "./ProjectSettingTasktype";
import ProjectSettingPriority from "./ProjectSettingPriority";
import ProjectSettingPlatform from "./ProjectSettingPlatform";

// Import Menu Tab
import ProjectSettingMenu from "../../components/project/ProjectSettingMenu";

const ProjectSettingsPage = () => {
  // Lấy tên tab từ URL, ví dụ: "general", "members"
  const { tabName } = useParams();

  // Hàm render nội dung dựa vào `tabName`
  const renderTabContent = () => {
    switch (tabName) {
      case "members":
        return <ProjectSettingMembers />;
      case "priority":
        return <ProjectSettingPriority />;
      case "tasktype":
        return <ProjectSettingTaskType />;
      case "platform":
        return <ProjectSettingPlatform />;
      case "general":
      default:
        return <ProjectSettingsGeneral />;
    }
  };

  return (
    <div className="project-settings-container">
      <ProjectSettingMenu />
      <div className="settings-content-area">{renderTabContent()}</div>
    </div>
  );
};

export default ProjectSettingsPage;
