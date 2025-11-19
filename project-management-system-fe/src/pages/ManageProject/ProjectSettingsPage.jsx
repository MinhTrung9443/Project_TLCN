// src/pages/ManageProject/ProjectSettingsPage.jsx
// [PHIÊN BẢN MỚI] - Component cha chịu trách nhiệm nạp dữ liệu

import React, { useEffect, useContext } from 'react';
import { useParams, Outlet } from 'react-router-dom'; // Dùng Outlet để render các tab con
import { ProjectContext } from '../../contexts/ProjectContext';
import ProjectSettingMenu from '../../components/project/ProjectSettingMenu';

const ProjectSettingsPage = () => {
    const { projectKey } = useParams();
    // Lấy đầy đủ các giá trị từ context
    const { setProjectKey, projectData, loadingProject } = useContext(ProjectContext);

    useEffect(() => {
        // Chỉ gọi để nạp dữ liệu KHI component này được mount
        setProjectKey(projectKey);

        // Cleanup function: Rất quan trọng để reset context khi người dùng rời khỏi trang settings
        return () => {
            setProjectKey(null);
        }
    }, [projectKey, setProjectKey]); // Chỉ chạy lại khi projectKey trên URL thay đổi

    // Hiển thị trạng thái loading trong khi chờ context nạp dữ liệu
    if (loadingProject) {
        return <div>Loading project...</div>;
    }

    // Nếu không có dữ liệu sau khi load xong, hiển thị lỗi
    if (!projectData) {
        return <div>Project not found.</div>;
    }

    // Nếu có dữ liệu, hiển thị layout của trang settings
    return (
        <div className="project-settings-container">
            <ProjectSettingMenu />
            <div className="settings-content-area">
                {/* Outlet là nơi React Router sẽ render các component con (General, Members...) */}
                <Outlet />
            </div>
        </div>
    );
};

export default ProjectSettingsPage;