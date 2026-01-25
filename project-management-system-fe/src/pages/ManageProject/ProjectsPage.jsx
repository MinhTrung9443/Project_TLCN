import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ProjectContext } from "../../contexts/ProjectContext";
import { getProjects, getArchivedProjects, archiveProjectByKey, restoreProject, permanentlyDeleteProject } from "../../services/projectService";
import { toast } from "react-toastify";
import CreateProjectModal from "../../components/project/CreateProjectModal";
import ProjectActionsMenu from "../../components/project/ProjectActionsMenu";
import ArchivedProjectActionsMenu from "../../components/project/ArchivedProjectActionsMenu";
import ConfirmationModal from "../../components/common/ConfirmationModal";

const ProjectsPage = () => {
  const { user } = useAuth();
  const { selectedProjectKey, setProject, clearProject } = useContext(ProjectContext);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    projectManager: "",
    status: "active",
  });
  const [projects, setProjects] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [view, setView] = useState("active");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = useCallback(
    async (currentSearchTerm) => {
      setLoading(true);
      try {
        if (view === "active") {
          // Truyền giá trị tìm kiếm vào hàm getProjects
          const response = await getProjects(currentSearchTerm);
          setProjects(response.data);
        } else {
          // Tìm kiếm ở trang archived
          const response = await getArchivedProjects(currentSearchTerm);
          setArchivedProjects(response.data);
        }
      } catch (error) {
        toast.error(`Could not fetch ${view} projects.`);
      } finally {
        setLoading(false);
      }
    },
    [view], // Chỉ phụ thuộc vào `view`
  );

  useEffect(() => {
    const timerId = setTimeout(() => {
      fetchData(searchTerm);
      setCurrentPage(1); // Reset to page 1 when search changes
    }, 300);
    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm, fetchData]);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when view changes
  }, [view]);

  const handleProjectCreated = () => {
    setSearchTerm("");
    fetchData("");
  };

  const openArchiveModal = (project) => {
    setSelectedProject(project);
    setDeleteAction("archive");
    setIsDeleteModalOpen(true);
  };

  const openPermanentDeleteModal = (project) => {
    setSelectedProject(project);
    setDeleteAction("permanent");
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProject || !deleteAction) return;

    try {
      if (deleteAction === "archive") {
        await archiveProjectByKey(selectedProject.key);
        fetchData(searchTerm); // Tải lại danh sách với filter hiện tại
        toast.success("Project archived successfully!");
      } else if (deleteAction === "permanent") {
        await permanentlyDeleteProject(selectedProject._id);
        fetchData(searchTerm); // Tải lại danh sách với filter hiện tại
        toast.success("Project permanently deleted!");
      }
    } catch (error) {
      toast.error(`Failed to ${deleteAction} project.`);
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedProject(null);
      setDeleteAction(null);
    }
  };

  const handleRestore = async (project) => {
    try {
      await restoreProject(project._id);
      fetchData(searchTerm);
      toast.success("Project restored successfully!");
    } catch (error) {
      toast.error("Failed to restore project.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-CA");
  };

  const handleProjectSelect = (project) => {
    if (view === "active") {
      // 1. Cập nhật Context ngay lập tức để Sidebar hiển thị menu con
      setProject(project);

      // 2. Điều hướng thẳng đến trang Settings General của dự án đó
      navigate(`/app/task-mgmt/projects/${project.key}/settings/general`);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  const getTotalMembers = (project) => {
    // Tính tổng members từ project.members
    let totalMembers = project.members ? project.members.length : 0;

    // Thêm tất cả members từ các teams
    if (project.teams && Array.isArray(project.teams)) {
      project.teams.forEach((team) => {
        // Đếm leader (nếu có)
        if (team.leaderId) {
          totalMembers += 1;
        }
        // Đếm members trong team
        if (team.members && Array.isArray(team.members)) {
          totalMembers += team.members.length;
        }
      });
    }

    return totalMembers;
  };

  const getFilteredProjects = () => {
    const projectList = view === "active" ? projects : archivedProjects;

    const filtered = projectList.filter((project) => {
      // Filter by type
      if (filters.type && project.type !== filters.type) return false;

      // Filter by project manager
      if (filters.projectManager && project.projectManager?._id !== filters.projectManager) return false;

      // Filter by status
      if (filters.status && project.status !== filters.status) return false;

      return true;
    });

    return filtered;
  };

  const getPaginatedProjects = () => {
    const filtered = getFilteredProjects();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filtered = getFilteredProjects();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  // Get unique project managers for filter dropdown
  const getProjectManagers = () => {
    const projectList = view === "active" ? projects : archivedProjects;
    const managers = new Map();
    projectList.forEach((project) => {
      if (project.projectManager) {
        managers.set(project.projectManager._id, project.projectManager);
      }
    });
    return Array.from(managers.values());
  };

  const renderFilters = () => (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
      <select
        value={filters.type}
        onChange={(e) => handleFilterChange("type", e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value="">All Types</option>
        <option value="Scrum">Scrum</option>
        <option value="Kanban">Kanban</option>
      </select>

      <select
        value={filters.projectManager}
        onChange={(e) => handleFilterChange("projectManager", e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value="">All Project Managers</option>
        {getProjectManagers().map((pm) => (
          <option key={pm._id} value={pm._id}>
            {pm.fullname}
          </option>
        ))}
      </select>

      {view === "active" && (
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      )}

      <button
        onClick={() => setFilters({ type: "", projectManager: "", status: "" })}
        className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
      >
        Clear Filters
      </button>
    </div>
  );

  const renderProjects = () => {
    const paginatedProjects = getPaginatedProjects();

    return paginatedProjects.map((project) => (
      <tr
        key={project._id}
        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
        style={{ cursor: view === "active" ? "pointer" : "default" }}
      >
        <td className="px-6 py-4">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleProjectSelect(project);
            }}
            className="text-purple-600 hover:text-purple-700 font-medium no-underline"
          >
            {project.name}
          </a>
        </td>
        <td className="px-6 py-4 text-sm text-gray-700">{project.key}</td>
        <td className="px-6 py-4 text-sm text-gray-700">{project.type}</td>
        <td className="px-6 py-4 text-sm text-gray-700">{project.projectManager?.fullname || "N/A"}</td>
        <td className="px-6 py-4 text-sm text-gray-700">{getTotalMembers(project)}</td>
        <td className="px-6 py-4 text-sm text-gray-700">{formatDate(view === "active" ? project.createdAt : project.deletedAt)}</td>
        <td className="px-6 py-4">
          <span
            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              view === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {view === "active" ? project.status : "Archived"}
          </span>
        </td>
        <td className="px-6 py-4">
          {view === "active" ? (
            <ProjectActionsMenu project={project} onDelete={openArchiveModal} />
          ) : (
            <ArchivedProjectActionsMenu project={project} onRestore={handleRestore} onDelete={openPermanentDeleteModal} />
          )}
        </td>
      </tr>
    ));
  };
  return (
    <>
      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onProjectCreated={handleProjectCreated} />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={deleteAction === "archive" ? "Archive Project" : "Delete Project Permanently"}
        message={`Are you sure you want to ${deleteAction === "archive" ? "archive" : "permanently delete"} the project "${
          selectedProject?.name
        }"? This action cannot be undone.`}
      />

      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white py-8 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-purple-100">
                <span className="material-symbols-outlined">folder_open</span>
                <span className="text-sm font-medium">Project Management</span>
              </div>
              <h1 className="text-4xl font-bold mb-1">Projects</h1>
              <p className="text-purple-100">Manage and organize all your projects in one place</p>
            </div>
            {view === "active" && user?.role === "admin" && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-white text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <span className="material-symbols-outlined">add</span>
                Create Project
              </button>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setView("active")}
                className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                  view === "active" ? "bg-purple-600 text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                All Projects
              </button>
              {user?.role === "admin" && (
                <button
                  onClick={() => setView("archived")}
                  className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                    view === "archived" ? "bg-purple-600 text-white" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Archived Projects
                </button>
              )}
            </div>
            <input
              type="search"
              placeholder="Search by name or key..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-full md:w-80"
            />
          </div>

          {renderFilters()}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 text-lg">Loading...</div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Project</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Key</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Project Manager</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Members</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      {view === "active" ? "Created Date" : "Archived Date"}
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900"></th>
                  </tr>
                </thead>
                <tbody>
                  {renderProjects().length > 0 ? (
                    renderProjects()
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                        No projects found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && getTotalPages() > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="text-sm text-gray-600">
                Page {currentPage} of {getTotalPages()} ({getFilteredProjects().length} total projects)
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(getTotalPages(), prev + 1))}
                disabled={currentPage === getTotalPages()}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProjectsPage;
