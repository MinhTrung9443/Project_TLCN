// contexts/ProjectContext.js

import React, { useState, useMemo } from 'react';
import { getProjectByKey } from '../services/projectService';
import { useAuth } from './AuthContext';

export const ProjectContext = React.createContext({
  projectData: null,
  userProjectRole: null,
  selectedProjectKey: null,
  setProjectKey: () => {}, // <--- Hàm sẽ có tên này
  loadingProject: true,
});

export const ProjectProvider = ({ children }) => {
  const { user } = useAuth();
  const [projectData, setProjectData] = useState(null);
  const [userProjectRole, setUserProjectRole] = useState(null);
  // State lưu trữ key hiện tại
  const [currentProjectKey, setCurrentProjectKey] = useState(null); // <--- Đổi tên state để tránh nhầm lẫn
  const [loadingProject, setLoadingProject] = useState(true);

  // Hàm để thay đổi project key
  const setProjectKey = async (key) => {
    if (!key) {
      setProjectData(null);
      setUserProjectRole(null);
      setCurrentProjectKey(null); // <--- Cập nhật state này
      setLoadingProject(false);
      return;
    }
    
    setLoadingProject(true);
    setCurrentProjectKey(key); // <--- Cập nhật state này
    try {
      const response = await getProjectByKey(key);
      const project = response.data;
      setProjectData(project);

      if (user && project.members) {
        const currentUserAsMember = project.members.find(
          (member) => member.userId._id === user._id
        );
        setUserProjectRole(currentUserAsMember ? currentUserAsMember.role : null);
      }
    } catch (error) {
      console.error("Failed to fetch project data:", error);
      setProjectData(null);
      setUserProjectRole(null);
    } finally {
      setLoadingProject(false);
    }
  };
  
  const value = useMemo(() => ({
    projectData,
    userProjectRole,
    selectedProjectKey: currentProjectKey, // <--- Export state ra với tên 'selectedProjectKey'
    setProjectKey,                          // <--- Export hàm ra với tên 'setProjectKey'
    loadingProject,
  }), [projectData, userProjectRole, currentProjectKey, loadingProject]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};