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
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/Table";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";

const ProjectsPage = () => {
  const { user } = useAuth();
  const { setProject } = useContext(ProjectContext);
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
  const [layoutMode, setLayoutMode] = useState("compact");
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

  const renderGridProjects = () => {
    const paginatedProjects = getPaginatedProjects();

    return paginatedProjects.map((project) => (
      <div key={project._id} className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleProjectSelect(project);
                }}
                className="text-primary-600 hover:text-primary-700 font-semibold text-lg"
              >
                {project.name}
              </button>
              <div className="text-xs text-neutral-500 mt-1">{project.key} • {project.type || "-"}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={view === "active" ? "success" : "danger"}>{view === "active" ? project.status : "Archived"}</Badge>
            </div>
          </div>

          <div className="mt-3 text-sm text-neutral-600 grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-neutral-500">Manager</div>
              <div className="truncate">{project.projectManager?.fullname || "N/A"}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Members</div>
              <div>{getTotalMembers(project)}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">{view === "active" ? "Created" : "Archived"}</div>
              <div>{formatDate(view === "active" ? project.createdAt : project.deletedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Type</div>
              <div>{project.type || "-"}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-neutral-500">Key: {project.key}</div>
          <div>
            {view === "active" ? (
              <ProjectActionsMenu project={project} onDelete={openArchiveModal} />
            ) : (
              <ArchivedProjectActionsMenu project={project} onRestore={handleRestore} onDelete={openPermanentDeleteModal} />
            )}
          </div>
        </div>
      </div>
    ));
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
    <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">Type</label>
          <Select value={filters.type} onChange={(e) => handleFilterChange("type", e.target.value)} placeholder={null}>
            <option value="">All Types</option>
            <option value="Scrum">Scrum</option>
            <option value="Kanban">Kanban</option>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">Manager</label>
          <Select value={filters.projectManager} onChange={(e) => handleFilterChange("projectManager", e.target.value)} placeholder={null}>
            <option value="">All Project Managers</option>
            {getProjectManagers().map((pm) => (
              <option key={pm._id} value={pm._id}>
                {pm.fullname}
              </option>
            ))}
          </Select>
        </div>

        {view === "active" ? (
          <div>
            <label className="block text-xs font-semibold text-neutral-500 mb-1">Status</label>
            <Select value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)} placeholder={null}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center justify-end">
          <Button variant="secondary" size="md" onClick={() => setFilters({ type: "", projectManager: "", status: "" })} className="w-full">
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );

  const renderProjects = () => {
    const paginatedProjects = getPaginatedProjects();

    return paginatedProjects.map((project) => (
      <TableRow key={project._id}>
        <TableCell>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleProjectSelect(project);
            }}
            className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            {project.name}
          </button>
        </TableCell>
        <TableCell>{project.key}</TableCell>
        <TableCell>{project.type}</TableCell>
        <TableCell>{project.projectManager?.fullname || "N/A"}</TableCell>
        <TableCell>{getTotalMembers(project)}</TableCell>
        <TableCell>{formatDate(view === "active" ? project.createdAt : project.deletedAt)}</TableCell>
        <TableCell>
          <Badge variant={view === "active" ? "success" : "danger"}>{view === "active" ? project.status : "Archived"}</Badge>
        </TableCell>
        <TableCell>
          {view === "active" ? (
            <ProjectActionsMenu project={project} onDelete={openArchiveModal} />
          ) : (
            <ArchivedProjectActionsMenu project={project} onRestore={handleRestore} onDelete={openPermanentDeleteModal} />
          )}
        </TableCell>
      </TableRow>
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

      <div className="min-h-screen bg-neutral-50">
        <PageHeader
          icon="folder_open"
          badge={view === "active" ? "Active" : "Archived"}
          title="Projects"
          subtitle="Manage and organize all your projects in one place"
          actions={
            view === "active" &&
            user?.role === "admin" && (
              <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)} icon="add">
                Create Project
              </Button>
            )
          }
        />

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2">
              <Button variant={view === "active" ? "primary" : "secondary"} size="md" onClick={() => setView("active")}>
                All Projects
              </Button>
              {user?.role === "admin" && (
                <Button variant={view === "archived" ? "primary" : "secondary"} size="md" onClick={() => setView("archived")}>
                  Deleted Projects
                </Button>
              )}
                <div className="flex items-center gap-2 ml-2">
                  <Button variant={layoutMode === "compact" ? "primary" : "secondary"} size="sm" onClick={() => setLayoutMode("compact")} icon="view_list">
                    Compact
                  </Button>
                  <Button variant={layoutMode === "grid" ? "primary" : "secondary"} size="sm" onClick={() => setLayoutMode("grid")} icon="grid_view">
                    Grid
                  </Button>
                </div>
            </div>
            <div className="w-full lg:max-w-sm">
              <Input
                type="search"
                placeholder="Search by name or key..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon="search"
              />
            </div>
          </div>

          {renderFilters()}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" text="Loading projects..." />
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-neutral-200 overflow-x-auto">
              {layoutMode === "grid" ? (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {renderGridProjects().length > 0 ? (
                    renderGridProjects()
                  ) : (
                    <div className="col-span-full text-center py-12 text-neutral-500">No projects found.</div>
                  )}
                </div>
              ) : (
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead>Project</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Project Manager</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>{view === "active" ? "Created Date" : "Archived Date"}</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderProjects().length > 0 ? (
                      renderProjects()
                    ) : (
                      <TableRow>
                        <TableCell colSpan="8" className="text-center py-8 text-neutral-500">
                          No projects found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {!loading && getTotalPages() > 1 && (
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                icon="arrow_back"
              >
                Previous
              </Button>
              <div className="text-sm text-neutral-600">
                Page {currentPage} of {getTotalPages()} ({getFilteredProjects().length} total projects)
              </div>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setCurrentPage((prev) => Math.min(getTotalPages(), prev + 1))}
                disabled={currentPage === getTotalPages()}
                icon="arrow_forward"
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
