import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ProjectContext } from '../../contexts/ProjectContext';
import { getProjects, deleteProject } from '../../services/projectService';
import { toast } from 'react-toastify';
import CreateProjectModal from '../../components/project/CreateProjectModal';
import ProjectActionsMenu from '../../components/project/ProjectActionsMenu';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import CloneProjectModal from '../../components/project/CloneProjectModal';
import '../../styles/pages/ManageProject/ProjectsPage.css';

const ProjectsPage = () => {
  const { user } = useAuth();
  const { setSelectedProjectKey } = useContext(ProjectContext);
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await getProjects();
        setProjects(response.data);
      } catch (error) {
        toast.error('Could not fetch projects.');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const handleProjectCreated = (newProject) => {
    setProjects([newProject, ...projects]);
  };
  const handleProjectCloned = (clonedProject) => {
    setProjects([clonedProject, ...projects]);
  };

  const openDeleteModal = (project) => {
    setSelectedProject(project);
    setIsDeleteModalOpen(true);
  };

  const openCloneModal = (project) => {
    setSelectedProject(project);
    setIsCloneModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProject) return;
    try {
      await deleteProject(selectedProject._id);
      setProjects(projects.filter(p => p._id !== selectedProject._id));
      toast.success('Project deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete project.');
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedProject(null);
    }
  };
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-CA');
  };
  const handleProjectSelect = (project) => {
    setSelectedProjectKey(project.key.toUpperCase());
    navigate(`/task-mgmt/projects/${project.key}/settings/general`);
  };
  return (
    <>
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete the project "${selectedProject?.name}"?`}
      />
      <CloneProjectModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        sourceProject={selectedProject}
        onProjectCloned={handleProjectCloned}
      />
      <div className="projects-page-container">
        <header className="projects-header">
          <h1 className="projects-title">Projects</h1>
          <div className="projects-actions">
            {user && user.role === 'admin' && (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                Create Project
              </button>
            )}
          </div>
        </header>

        <div className="projects-content-wrapper">
          <div className="projects-controls">
            <button className="filter-btn">Filter</button>
            <input type="search" placeholder="Search..." className="search-input" />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
          ) : (
            <div className="table-wrapper">
              <table className="projects-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Key</th>
                    <th>Type</th>
                    <th>Project Manager</th>
                    <th>Members</th>
                    <th>Created Date</th>
                    <th>Status</th>
                    <th>{ }</th>

                  </tr>
                </thead>
                <tbody>
                  {projects.length > 0 ? (
                    projects.map((project) => (
                      <tr key={project._id} onClick={() => handleProjectSelect(project)} style={{cursor: 'pointer'}}>
                        <td><a href="#" className="project-name-link">{project.name}</a></td>
                        <td>{project.key}</td>
                        <td>{project.type}</td>
                        <td>{project.projectLeaderId?.fullname || 'N/A'}</td>
                        <td>{project.members.length}</td>
                        <td>{formatDate(project.createdAt)}</td>
                        <td>
                          <span className="status-badge status-active">
                            {project.status}
                          </span>
                        </td>
                        <td>
                          <ProjectActionsMenu
                            project={project}
                            onDelete={openDeleteModal}
                            onClone={openCloneModal}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="no-projects-message">
                      <td colSpan="7">No projects found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProjectsPage;