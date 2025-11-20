// src/pages/ManageProject/ProjectSettingsPage.jsx
// [PHIÊN BẢN MỚI - TỰ NẠP DỮ LIỆU]

import React, { useEffect, useContext } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { ProjectContext } from '../../contexts/ProjectContext';
import { getProjectByKey } from '../../services/projectService';
import { toast } from 'react-toastify';
import ProjectSettingMenu from '../../components/project/ProjectSettingMenu';

const ProjectSettingsPage = () => {
    const { projectKey } = useParams();
    const { 
        projectData, 
        setProject, 
        setLoadingProject, 
        loadingProject, 
        selectedProjectKey 
    } = useContext(ProjectContext);

    useEffect(() => {
        // Chỉ nạp dữ liệu nếu project trong context không phải là project chúng ta cần
        if (projectKey?.toUpperCase() !== selectedProjectKey?.toUpperCase()) {
            setLoadingProject(true);
            getProjectByKey(projectKey)
                .then(response => {
                    // Cập nhật dữ liệu vào context
                    setProject(response.data);
                })
                .catch(error => {
                    toast.error("Failed to load project details.");
                    setProject(null); // Xóa dữ liệu nếu có lỗi
                })
                .finally(() => {
                    setLoadingProject(false);
                });
        }
    }, [projectKey, selectedProjectKey, setProject, setLoadingProject]);

    if (loadingProject) {
        return <div>Loading project...</div>;
    }

    if (!projectData) {
        return <div>Project not found.</div>;
    }

    return (
        <div className="project-settings-container">
            <ProjectSettingMenu />
            <div className="settings-content-area">
                <Outlet />
            </div>
        </div>
    );
};

export default ProjectSettingsPage;