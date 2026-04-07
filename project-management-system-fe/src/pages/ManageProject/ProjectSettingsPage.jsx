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
        subtitle={`Configure workspace details, workflows, and metadata for ${projectData.name || "this project"}`}
        badge={projectData.key}
        icon="tune"
      />

      <div className="flex gap-6 items-start">
        <div className="w-64 flex-shrink-0 sticky top-6">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 px-4 py-6 -mx-6 -mt-6 mb-4">
              <div className="flex items-center gap-3 text-white">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">settings</span>
                </div>
                <div>
                  <h2 className="font-bold text-lg">{projectData?.name || "Project"}</h2>
                  <p className="text-sm text-primary-100">Settings & Configuration</p>
                </div>
              </div>
            </div>
            <ProjectSettingMenu />
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          <Card>
            <Outlet />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsPage;
