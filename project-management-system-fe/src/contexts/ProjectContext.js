// src/contexts/ProjectContext.js
// [PHIÊN BẢN MỚI - TỐI GIẢN]

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';

export const ProjectContext = React.createContext(null);

export const ProjectProvider = ({ children }) => {
  const { user } = useAuth();
  const [projectData, setProjectData] = useState(null);
  const [userProjectRole, setUserProjectRole] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false); // Thêm state loading

  // Hàm để các component con gọi để CẬP NHẬT context
  const setProject = useCallback((project) => {
    setProjectData(project);
    if (user && project && project.members) {
      const member = project.members.find(m => m.userId?._id === user?._id);
      setUserProjectRole(member ? member.role : null);
    } else {
      setUserProjectRole(null);
    }
  }, [user]);

  // Hàm để các component con gọi để DỌN DẸP context
  const clearProject = useCallback(() => {
    setProjectData(null);
    setUserProjectRole(null);
  }, []);

  const value = useMemo(() => ({
    projectData,
    userProjectRole,
    loadingProject,
    setLoadingProject, // Export hàm set loading
    setProject,       // Export hàm set data
    clearProject,     // Export hàm dọn dẹp
    selectedProjectKey: projectData?.key || null, // Vẫn giữ để sidebar có thể dùng
  }), [projectData, userProjectRole, loadingProject, setProject, clearProject]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};