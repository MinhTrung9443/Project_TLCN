import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getProjects } from '../../services/projectService';
import { toast } from 'react-toastify';
import CreateProjectModal from '../../components/project/CreateProjectModal';

import '../../styles/pages/ManageProject/ProjectsPage.css';

const ProjectsPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-CA'); 
  };

  return (
    <>
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={handleProjectCreated}
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
                  </tr>
                </thead>
                <tbody>
                  {projects.length > 0 ? (
                    projects.map((project) => (
                      <tr key={project._id}>
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