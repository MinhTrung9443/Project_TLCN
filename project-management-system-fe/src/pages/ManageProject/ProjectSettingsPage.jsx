// src/pages/ManageProject/ProjectSettingsPage.jsx
// [PHIÊN BẢN MỚI - TỰ NẠP DỮ LIỆU]

import React, { useEffect, useContext } from "react";
import { useParams, Outlet } from "react-router-dom";
import { toast } from "react-toastify";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import ProjectSettingMenu from "../../components/project/ProjectSettingMenu";
import { ProjectContext } from "../../contexts/ProjectContext";
import { getProjectByKey } from "../../services/projectService";

const ProjectSettingsPage = () => {
  const { projectKey } = useParams();
  const { projectData, setProject, setLoadingProject, loadingProject, selectedProjectKey } = useContext(ProjectContext);

  useEffect(() => {
    // Chỉ nạp dữ liệu nếu project trong context không phải là project chúng ta cần
    if (projectKey?.toUpperCase() !== selectedProjectKey?.toUpperCase()) {
      setLoadingProject(true);
      getProjectByKey(projectKey)
        .then((response) => {
          // Cập nhật dữ liệu vào context
          setProject(response.data);
        })
        .catch((error) => {
          toast.error("Failed to load project details.");
          setProject(null); // Xóa dữ liệu nếu có lỗi
        })
        .finally(() => {
          setLoadingProject(false);
        });
    }
  }, [projectKey, selectedProjectKey, setProject, setLoadingProject]);

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" text="Loading project settings..." />
      </div>
    );
  }

  if (!projectData) {
    return (
      <EmptyState
        icon="folder_off"
        title="Project not found"
        description="We could not locate this project. Please check the URL or select another project."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Settings"
        subtitle={`Configure workspace details, workflows, and metadata for ${projectData.name || "this project"} (${projectData.key})`}
        badge={projectData.status === "completed" ? "Completed" : "Active"}
        icon="tune"
      />

      <div className="grid grid-cols-[280px_1fr] gap-6 items-start">
        <Card padding={false} className="sticky top-24 self-start">
          <ProjectSettingMenu />
        </Card>

        <div className="space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsPage;
