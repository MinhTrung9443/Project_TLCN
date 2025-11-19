// src/components/layout/ProjectLayout.jsx
// [PHIÊN BẢN ĐÃ SỬA LỖI VÒNG LẶP]

import React, { useEffect, useContext } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { ProjectContext } from '../../contexts/ProjectContext';

const ProjectLayout = () => {
    const { projectKey } = useParams();
    // Lấy thêm 'selectedProjectKey' từ context để so sánh
    const { setProjectKey, projectData, loadingProject, selectedProjectKey } = useContext(ProjectContext);

    useEffect(() => {
        // [LOGIC MỚI ĐỂ CHẶN VÒNG LẶP]
        // Chỉ gọi API để nạp dữ liệu KHI:
        // 1. projectKey từ URL có tồn tại.
        // 2. projectKey từ URL KHÁC với project key hiện đang được lưu trong context.
        //    Điều này ngăn việc gọi lại API một cách không cần thiết khi component re-render.
        if (projectKey && projectKey.toUpperCase() !== selectedProjectKey?.toUpperCase()) {
            setProjectKey(projectKey);
        }

        // Cleanup function vẫn giữ nguyên vai trò quan trọng của nó
        // Nó sẽ được gọi khi bạn rời khỏi TOÀN BỘ các trang của dự án này
        // (ví dụ: click về Dashboard hoặc trang Projects list)
        return () => {
            setProjectKey(null);
        }
    // Thêm 'selectedProjectKey' vào dependency array để useEffect có thể so sánh đúng
    }, [projectKey, setProjectKey, selectedProjectKey]);

    // Phần logic hiển thị bên dưới đã đúng và không cần thay đổi
    if (loadingProject) {
        // Chỉ hiển thị loading nếu `projectKey` từ URL khác với key đang được lưu
        // Hoặc nếu chưa có dữ liệu nào được tải
        if (projectKey?.toUpperCase() !== selectedProjectKey?.toUpperCase() || !projectData) {
            return <div>Loading project...</div>;
        }
    }

    if (!projectData) {
        return <div>Project not found.</div>;
    }

    // Nếu có dữ liệu, render ra các trang con (Settings, Backlog...)
    return <Outlet />;
};

export default ProjectLayout;