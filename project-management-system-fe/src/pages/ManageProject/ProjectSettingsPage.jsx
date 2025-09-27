// src/pages/ManageProject/ProjectSettingsPage.jsx

import React from 'react';
import { useParams } from 'react-router-dom';

// Import các component con tương ứng với từng tab
import ProjectSettingsGeneral from './ProjectSettingsGeneral';
import ProjectSettingMembers from './ProjectSettingMembers';

// Import Menu Tab
import ProjectSettingMenu from '../../components/project/ProjectSettingMenu';

const ProjectSettingsPage = () => {
    // Lấy tên tab từ URL, ví dụ: "general", "members"
    const { tabName, projectKey } = useParams();

    // Hàm render nội dung dựa vào `tabName`
    const renderTabContent = () => {
        switch (tabName) {
            case 'members':
                return <ProjectSettingMembers/>;
            //case 'priority':
                //return <ProjectSettingPriority/>;
           // case 'task-type':
              //  return <ProjectSettingTaskType/>;
           // case 'platform':
           //     return <ProjectSettingPlatform/>;
            case 'general':
            default:
                return <ProjectSettingsGeneral/>;
        }
    };

     return (
        <div className="project-settings-container">

            <ProjectSettingMenu/>
                <div className="settings-content-area">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default ProjectSettingsPage;