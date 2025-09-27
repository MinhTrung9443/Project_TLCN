import React from 'react';

// 1. Tạo Context với một giá trị mặc định
// Nó sẽ chứa key của project được chọn và một hàm để cập nhật key đó.
export const ProjectContext = React.createContext({
  selectedProjectKey: null,
  setSelectedProjectKey: () => {},
});

// 2. Tạo một "Provider" component
// Component này sẽ bao bọc ứng dụng của bạn và cung cấp state cho các component con.
export const ProjectProvider = ({ children }) => {
  const [selectedProjectKey, setSelectedProjectKey] = React.useState(null);

  const value = { selectedProjectKey, setSelectedProjectKey };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};