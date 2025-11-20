// src/pages/ManageProject/ProjectsPage.jsx

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ProjectContext } from '../../contexts/ProjectContext';
import { getProjects, getArchivedProjects, archiveProjectByKey, restoreProject, permanentlyDeleteProject } from '../../services/projectService';
import { toast } from 'react-toastify';
import CreateProjectModal from '../../components/project/CreateProjectModal';
import ProjectActionsMenu from '../../components/project/ProjectActionsMenu';
import ArchivedProjectActionsMenu from '../../components/project/ArchivedProjectActionsMenu';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import CloneProjectModal from '../../components/project/CloneProjectModal';
import '../../styles/pages/ManageProject/ProjectsPage.css';

const ProjectsPage = () => {
  const { user } = useAuth();
  const { selectedProjectKey, setProjectKey } = useContext(ProjectContext); // <--- CẬP NHẬT DÒNG NÀY
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]); // **NEW**
  const [view, setView] = useState('active'); // 'active' or 'archived' **NEW**

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null); // 'archive' or 'permanent' **NEW**
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
const { clearProject } = useContext(ProjectContext);

    // useEffect này sẽ chạy MỘT LẦN DUY NHẤT khi vào trang
    useEffect(() => {
        // Dọn dẹp mọi dữ liệu của dự án cũ đang được chọn
        clearProject();
    }, [clearProject]);
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        if (view === 'active') {
          const response = await getProjects();
          setProjects(response.data);
        } else {
          const response = await getArchivedProjects();
          setArchivedProjects(response.data);
        }
      } catch (error) {
        toast.error(`Could not fetch ${view} projects.`);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [view]); // Re-fetch khi view thay đổi

  const handleProjectCreated = (newProject) => {
    setProjects([newProject, ...projects]);
  };

  const handleProjectCloned = (clonedProject) => {
    setProjects([clonedProject, ...projects]);
  };

  // Mở modal cho việc Archive
  const openArchiveModal = (project) => {
    setSelectedProject(project);
    setDeleteAction('archive');
    setIsDeleteModalOpen(true);
  };
  
  // Mở modal cho việc Xóa vĩnh viễn
  const openPermanentDeleteModal = (project) => {
    setSelectedProject(project);
    setDeleteAction('permanent');
    setIsDeleteModalOpen(true);
  };

  const openCloneModal = (project) => {
    setSelectedProject(project);
    setIsCloneModalOpen(true);
  };

 const handleConfirmDelete = async () => {
    if (!selectedProject || !deleteAction) return;
    
    try {
      if (deleteAction === 'archive') {
        await archiveProjectByKey(selectedProject.key); 
        const remainingProjects = projects.filter(p => p._id !== selectedProject._id);
        setProjects(remainingProjects);
        
        // Dùng selectedProjectKey từ context để so sánh
        if (selectedProject.key.toUpperCase() === selectedProjectKey?.toUpperCase()) {
          setProjectKey(remainingProjects.length > 0 ? remainingProjects[0].key.toUpperCase() : null);
        }
        toast.success('Project archived successfully!');

      } else if (deleteAction === 'permanent') {
        await permanentlyDeleteProject(selectedProject._id);
        setArchivedProjects(archivedProjects.filter(p => p._id !== selectedProject._id));
        toast.success('Project permanently deleted!');
      }
    } catch (error) {
      toast.error(`Failed to ${deleteAction} project.`);
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedProject(null);
      setDeleteAction(null);
    }
  };


  // **NEW**: Xử lý Restore
  const handleRestore = async (project) => {
    try {
      await restoreProject(project._id);
      setArchivedProjects(archivedProjects.filter(p => p._id !== project._id));
      toast.success('Project restored successfully!');
    } catch (error) {
      toast.error('Failed to restore project.');
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-CA');
  };

  const handleProjectSelect = (project) => {
        navigate(`/task-mgmt/projects/${project.key}/settings/general`);
    };


  const renderProjects = () => {
    const projectList = view === 'active' ? projects : archivedProjects;
    
    return projectList.map((project) => {
      // Tìm PM từ mảng members
      const projectManager = project.members.find(m => m.role === 'PROJECT_MANAGER');

      return (
        <tr key={project._id} onClick={() => handleProjectSelect(project)} style={{cursor: view === 'active' ? 'pointer' : 'default'}}>
          <td><a href="#" onClick={(e) => { e.preventDefault(); handleProjectSelect(project); }} className="project-name-link">{project.name}</a></td>
          <td>{project.key}</td>
          <td>{project.type}</td>
          {/* Hiển thị tên PM đã tìm được */}
          <td>{project.projectManager?.fullname || 'N/A'}</td>
          <td>{project.members.length}</td>
          <td>{formatDate(view === 'active' ? project.createdAt : project.deletedAt)}</td>
          <td>
            <span className={`status-badge ${view === 'active' ? 'status-active' : 'status-archived'}`}>
              {view === 'active' ? project.status : 'Archived'}
            </span>
          </td>
          <td>
          {view === 'active' ? (
            <ProjectActionsMenu
              project={project}
              onDelete={openArchiveModal}
              onClone={openCloneModal}
            />
          ) : (
            <ArchivedProjectActionsMenu 
              project={project}
              onRestore={handleRestore}
              onDelete={openPermanentDeleteModal}
            />
          )}
        </td>
      </tr>
      );
    });
  };
  return (
    <>
      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onProjectCreated={handleProjectCreated} />
      
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={deleteAction === 'archive' ? "Archive Project" : "Delete Project Permanently"}
        message={`Are you sure you want to ${deleteAction === 'archive' ? 'archive' : 'permanently delete'} the project "${selectedProject?.name}"? This action cannot be undone.`}
      />
      
      <CloneProjectModal isOpen={isCloneModalOpen} onClose={() => setIsCloneModalOpen(false)} sourceProject={selectedProject} onProjectCloned={handleProjectCloned} />
      
      <div className="projects-page-container">
        <header className="projects-header">
          <h1 className="projects-title">Projects</h1>
          {view === 'active' && user?.role === 'admin' && (
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
              Create Project
            </button>
          )}
        </header>

        <div className="projects-content-wrapper">
          <div className="projects-controls">
            <div className="view-toggle">
              <button className={`toggle-btn ${view === 'active' ? 'active' : ''}`} onClick={() => setView('active')}>All Projects</button>
              <button className={`toggle-btn ${view === 'archived' ? 'active' : ''}`} onClick={() => setView('archived')}>Archived Projects</button>
            </div>
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
                    <th>{view === 'active' ? 'Created Date' : 'Archived Date'}</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {renderProjects().length > 0 ? renderProjects() : (
                    <tr className="no-projects-message">
                      <td colSpan="8">No projects found.</td>
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