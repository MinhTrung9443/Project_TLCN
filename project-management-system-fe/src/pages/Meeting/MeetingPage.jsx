import React, { useState, useCallback, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PageHeader from "../../components/ui/PageHeader";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import MeetingListComponent from "../../components/meetings/MeetingListComponent";
import InvitationListComponent from "../../components/meetings/InvitationListComponent";
import ManagedMeetingListComponent from "../../components/meetings/ManagedMeetingListComponent";
import CreateMeetingModal from "../../components/modals/CreateMeetingModal";
import { useAuth } from "../../contexts/AuthContext";
import { ProjectContext } from "../../contexts/ProjectContext";
import { getProjectByKey } from "../../services/projectService";

const MeetingPage = () => {
  const { projectKey } = useParams();
  const { user } = useAuth();
  const { projectData, selectedProjectKey, setProject } = useContext(ProjectContext);
  const [activeTab, setActiveTab] = useState(user.role === "admin" ? "managed" : "list");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh key
  const [loadingProject, setLoadingProject] = useState(false);

  useEffect(() => {
    if (!projectKey) return;

    if (projectKey?.toUpperCase() === selectedProjectKey?.toUpperCase()) {
      return;
    }

    setLoadingProject(true);
    getProjectByKey(projectKey)
      .then((response) => {
        setProject(response.data);
      })
      .catch(() => {
        setProject(null);
        toast.error("Failed to load project details.");
      })
      .finally(() => {
        setLoadingProject(false);
      });
  }, [projectKey, selectedProjectKey, setProject]);

  const tabClass = (tabName) =>
    `px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
      activeTab === tabName ? "bg-primary-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
    }`;

  const handleMeetingCreated = useCallback(() => {
    setCreateModalOpen(false);
    // Trigger a refresh of the MeetingListComponent
    if (activeTab === "list") {
      setRefreshKey((oldKey) => oldKey + 1);
    } else {
      setActiveTab("list"); // Switch to the list to show the new meeting
    }
  }, [activeTab]);

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" text="Loading project meetings..." />
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
    <div className="flex flex-col h-screen bg-neutral-50">
      <PageHeader icon="groups" badge={projectKey} title="Meetings" subtitle="Schedule and manage project meetings" />

      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="h-full bg-white rounded-lg shadow-sm border border-neutral-200 flex flex-col">
          {/* Tab Navigation */}
          <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {!(user.role === "admin") && (
                <button onClick={() => setActiveTab("list")} className={tabClass("list")}>
                  All Meetings
                </button>
              )}
              {!(user.role === "admin") && (
                <button onClick={() => setActiveTab("invitations")} className={tabClass("invitations")}>
                  Invitations
                </button>
              )}
              <button onClick={() => setActiveTab("managed")} className={tabClass("managed")}>
                Managed Meetings
              </button>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600 flex items-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Create Meeting
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "list" && <MeetingListComponent key={refreshKey} />}
            {activeTab === "invitations" && <InvitationListComponent />}
            {activeTab === "managed" && <ManagedMeetingListComponent key={refreshKey} />}
          </div>
        </div>
      </div>
      {isCreateModalOpen && (
        <CreateMeetingModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} onMeetingCreated={handleMeetingCreated} />
      )}
    </div>
  );
};

export default MeetingPage;
