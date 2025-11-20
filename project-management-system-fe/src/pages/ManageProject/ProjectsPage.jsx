
import React, { useState, useEffect, useContext, useCallback } from 'react';
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
    const { selectedProjectKey, setProjectKey, clearProject } = useContext(ProjectContext);
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [archivedProjects, setArchivedProjects] = useState([]);
    const [view, setView] = useState('active');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteAction, setDeleteAction] = useState(null);
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

    // Dọn dẹp context khi vào trang
    useEffect(() => {
        clearProject();
    }, [clearProject]);

    // --- TÁI CẤU TRÚC LOGIC FETCH ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (view === 'active') {
                const response = await getProjects();
                setProjects(response.data);
            } else { // view === 'archived'
                const response = await getArchivedProjects();
                setArchivedProjects(response.data);
            }
        } catch (error) {
            toast.error(`Could not fetch ${view} projects.`);
        } finally {
            setLoading(false);
        }
    }, [view]); // Hàm này sẽ được tạo lại mỗi khi 'view' thay đổi

    // useEffect chính để gọi hàm fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]); // Chạy lại mỗi khi 'view' thay đổi

    // --- CÁC HÀM XỬ LÝ SỰ KIỆN ---
    const handleProjectCreated = () => {
        // Sau khi tạo, chỉ cần gọi lại fetchData. 
        // Vì 'view' đang là 'active', nó sẽ tự động fetch đúng danh sách.
        fetchData();
    };

    const handleProjectCloned = () => {
        fetchData();
    };

    const openArchiveModal = (project) => {
        setSelectedProject(project);
        setDeleteAction('archive');
        setIsDeleteModalOpen(true);
    };

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
                // Sau khi archive thành công, gọi lại fetchData để cập nhật cả 2 danh sách
                fetchData(); 
                toast.success('Project archived successfully!');
            } else if (deleteAction === 'permanent') {
                await permanentlyDeleteProject(selectedProject._id);
                // Tải lại danh sách archived projects
                fetchData();
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

    const handleRestore = async (project) => {
        try {
            await restoreProject(project._id);
            // Tải lại danh sách archived projects
            fetchData();
            toast.success('Project restored successfully!');
        } catch (error) {
            toast.error('Failed to restore project.');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-CA');
    };

    const handleProjectSelect = (project) => {
        if (view === 'active') {
            navigate(`/task-mgmt/projects/${project.key}/settings/general`);
        }
    };

    const renderProjects = () => {
        const projectList = view === 'active' ? projects : archivedProjects;

        return projectList.map((project) => (
            <tr key={project._id} onClick={() => handleProjectSelect(project)} style={{ cursor: view === 'active' ? 'pointer' : 'default' }}>
                <td><a href="#" onClick={(e) => { e.preventDefault(); handleProjectSelect(project); }} className="project-name-link">{project.name}</a></td>
                <td>{project.key}</td>
                <td>{project.type}</td>
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
                        <ProjectActionsMenu project={project} onDelete={openArchiveModal} onClone={openCloneModal} />
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