import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Form, Table, Badge } from "react-bootstrap";
import { useAuth } from "../../contexts/AuthContext";
import { ProjectContext } from "../../contexts/ProjectContext";
import { getProjects, getArchivedProjects, archiveProjectByKey, restoreProject, permanentlyDeleteProject } from "../../services/projectService";
import { toast } from "react-toastify";
import CreateProjectModal from "../../components/project/CreateProjectModal";
import ProjectActionsMenu from "../../components/project/ProjectActionsMenu";
import ArchivedProjectActionsMenu from "../../components/project/ArchivedProjectActionsMenu";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import "../../styles/pages/ManageProject/ProjectsPage.css";

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
    <div className="projects-filters">
      <Form.Select className="filter-select" value={filters.type} onChange={(e) => handleFilterChange("type", e.target.value)}>
        <option value="">All Types</option>
        <option value="Scrum">Scrum</option>
        <option value="Kanban">Kanban</option>
      </Form.Select>

      <Form.Select className="filter-select" value={filters.projectManager} onChange={(e) => handleFilterChange("projectManager", e.target.value)}>
        <option value="">All Project Managers</option>
        {getProjectManagers().map((pm) => (
          <option key={pm._id} value={pm._id}>
            {pm.fullname}
          </option>
        ))}
      </Form.Select>

      {view === "active" && (
        <Form.Select className="filter-select" value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </Form.Select>
      )}

      <Button className="btn-clear-filters" onClick={() => setFilters({ type: "", projectManager: "", status: "" })}>
        Clear Filters
      </Button>
    </div>
  );

  const renderProjects = () => {
    const paginatedProjects = getPaginatedProjects();

    return paginatedProjects.map((project) => (
      <tr key={project._id} onClick={() => handleProjectSelect(project)} style={{ cursor: view === "active" ? "pointer" : "default" }}>
        <td>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleProjectSelect(project);
            }}
            className="project-name-link"
          >
            {project.name}
          </a>
        </td>
        <td>{project.key}</td>
        <td>{project.type}</td>
        <td>{project.projectManager?.fullname || "N/A"}</td>
        <td>{getTotalMembers(project)}</td>
        <td>{formatDate(view === "active" ? project.createdAt : project.deletedAt)}</td>
        <td>
          <Badge className={view === "active" ? "status-active" : "status-archived"}>{view === "active" ? project.status : "Archived"}</Badge>
        </td>
        <td>
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

      <div className="projects-page-container">
        <div className="projects-hero">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="material-symbols-outlined">folder_open</span>
              Project Management
            </div>
            <h1 className="hero-title">Projects</h1>
            <p className="hero-subtitle">Manage and organize all your projects in one place</p>
          </div>
          {view === "active" && user?.role === "admin" && (
            <button className="btn-create-project" onClick={() => setIsModalOpen(true)}>
              <span className="material-symbols-outlined">add</span>
              Create Project
            </button>
          )}
        </div>

        <div className="projects-content-wrapper">
          <div className="projects-controls">
            <div className="view-toggle">
              <Button className={`toggle-btn ${view === "active" ? "active" : ""}`} onClick={() => setView("active")} variant="outline-primary">
                All Projects
              </Button>
              {user?.role === "admin" && (
                <Button className={`toggle-btn ${view === "archived" ? "active" : ""}`} onClick={() => setView("archived")} variant="outline-primary">
                  Delete Project
                </Button>
              )}
            </div>
            <Form.Control
              type="search"
              placeholder="Search by name or key..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {renderFilters()}

          {loading ? (
            <div className="loading-container">Loading...</div>
          ) : (
            <div className="table-wrapper">
              <Table className="projects-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Key</th>
                    <th>Type</th>
                    <th>Project Manager</th>
                    <th>Members</th>
                    <th>{view === "active" ? "Created Date" : "Archived Date"}</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {renderProjects().length > 0 ? (
                    renderProjects()
                  ) : (
                    <tr className="no-projects-message">
                      <td colSpan="8">No projects found.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}

          {!loading && getTotalPages() > 1 && (
            <div className="pagination-container">
              <Button
                className="pagination-btn"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="outline-primary"
              >
                Previous
              </Button>
              <div className="pagination-info">
                Page {currentPage} of {getTotalPages()} ({getFilteredProjects().length} total projects)
              </div>
              <Button
                className="pagination-btn"
                onClick={() => setCurrentPage((prev) => Math.min(getTotalPages(), prev + 1))}
                disabled={currentPage === getTotalPages()}
                variant="outline-primary"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProjectsPage;
