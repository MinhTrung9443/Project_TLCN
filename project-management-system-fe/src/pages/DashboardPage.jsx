import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ProjectContext } from "../contexts/ProjectContext";
import { getDashboardOverview, getDashboardActivity } from "../services/dashboardService";
import { getProjectById } from "../services/projectService";
import sprintService from "../services/sprintService";
import { toast } from "react-toastify";
import "../styles/pages/DashboardPage.css";

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setProject } = useContext(ProjectContext);
  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([getDashboardOverview(), getDashboardActivity({ limit: 5 })])
      .then(([overviewRes, activityRes]) => {
        setOverview(overviewRes.data);
        setActivity(activityRes.data);
      })
      .catch((err) => {
        console.error("Error loading dashboard:", err);
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Handle clicking on entity links in recent activity
  const handleEntityClick = async (log, e) => {
    e.preventDefault();

    if (log.entityType === "sprint" && log.relatedId) {
      // Sprint: fetch sprint to get project and navigate to backlog (tương tự NotificationBell)
      try {
        const sprint = await sprintService.getSprintById(log.relatedId);
        const projectId = sprint.projectId?._id || sprint.projectId;

        // Fetch full project data to set context
        const response = await getProjectById(projectId);
        const project = response.data;
        const projectKey = project?.key;

        if (projectKey) {
          // Set project data to context before navigating
          setProject(project);
          navigate(`/app/task-mgmt/projects/${projectKey}/backlog`);
        }
      } catch (error) {
        console.error("Error navigating to sprint:", error);
        toast.error("Could not navigate to sprint");
      }
    } else if (log.entityUrl) {
      // For other entities with URL, just navigate
      navigate(log.entityUrl);
    }
  };

  if (!user || loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="material-symbols-outlined">bolt</span>
            Productivity Hub
          </div>
          <h1 className="hero-title">Welcome back, {user.fullname}!</h1>
          <p className="hero-subtitle">Here's your productivity overview and recent activities</p>
        </div>
        <div className="hero-date">
          <span className="material-symbols-outlined">calendar_today</span>
          <span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <span className="material-symbols-outlined">assignment</span>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Tasks</div>
            <div className="stat-value">{overview?.total ?? 0}</div>
            <div className="stat-description">All tasks assigned to you</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="stat-content">
            <div className="stat-label">Completed</div>
            <div className="stat-value">{overview?.done ?? 0}</div>
            <div className="stat-description">Tasks successfully finished</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <span className="material-symbols-outlined">schedule</span>
          </div>
          <div className="stat-content">
            <div className="stat-label">Upcoming</div>
            <div className="stat-value">{overview?.upcomingTasks?.length ?? 0}</div>
            <div className="stat-description">Tasks with approaching deadlines</div>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <div className="stat-content">
            <div className="stat-label">Overdue</div>
            <div className="stat-value">{overview?.overdue ?? 0}</div>
            <div className="stat-description">Tasks past their deadline</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card upcoming-tasks">
          <div className="card-header">
            <h3 className="card-title">
              <span className="material-symbols-outlined">event</span>
              Upcoming Deadlines
            </h3>
            <span className="card-badge">{overview?.upcomingTasks?.length ?? 0}</span>
          </div>
          <div className="upcoming-tasks-list">
            {!overview?.upcomingTasks || overview.upcomingTasks.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">task_alt</span>
                <p>No upcoming tasks</p>
              </div>
            ) : (
              overview.upcomingTasks.map((task) => (
                <div
                  key={task._id}
                  className="upcoming-task-item"
                  onClick={() => task.key && navigate(`/app/task/${task.key}`)}
                  style={{ cursor: task.key ? "pointer" : "default" }}
                >
                  <div className="task-info">
                    <div className="task-name">{task.name}</div>
                    <div className="task-meta">
                      <span className="task-project">{task.projectId?.name || "Unknown Project"}</span>
                      {task.statusId?.name && <span className="task-status">{task.statusId.name}</span>}
                    </div>
                  </div>
                  <div className="task-due">
                    <span className="material-symbols-outlined">event</span>
                    <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-card project-progress">
          <div className="card-header">
            <h3 className="card-title">
              <span className="material-symbols-outlined">trending_up</span>
              Project Progress
            </h3>
            <span className="card-badge">{overview?.projectProgress?.length ?? 0}</span>
          </div>
          <div className="project-progress-list">
            {!overview?.projectProgress || overview.projectProgress.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">folder_off</span>
                <p>No active projects</p>
              </div>
            ) : (
              overview.projectProgress.map((proj) => (
                <div key={proj.projectKey} className="project-progress-item">
                  <div className="project-header">
                    <div className="project-info">
                      <div className="project-name">{proj.project}</div>
                      <div className="project-meta">
                        <span className="project-role">{proj.role}</span>
                        {proj.endDate && (
                          <span className="project-deadline">
                            <span className="material-symbols-outlined">event</span>
                            {new Date(proj.endDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="project-percentage">{proj.progress}%</div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${proj.progress}%` }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-card activity-feed">
        <div className="card-header">
          <h3 className="card-title">
            <span className="material-symbols-outlined">notifications_active</span>
            Recent Activity
          </h3>
          <span className="card-badge">{overview?.recentActivity?.length ?? 0}</span>
        </div>
        <div className="activity-timeline">
          {!overview?.recentActivity || overview.recentActivity.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined">history</span>
              <p>No recent activity</p>
            </div>
          ) : (
            overview.recentActivity.map((log, idx) => (
              <div key={log._id || idx} className="timeline-item">
                <div className="timeline-avatar">
                  {log.user.avatar ? (
                    <img src={log.user.avatar} alt={log.user.name} />
                  ) : (
                    <div className="avatar-placeholder">{log.user.name?.[0] || "?"}</div>
                  )}
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="user-name">{log.user.name}</span>
                    <span className="action-text">{log.action}</span>
                    {log.entityUrl ? (
                      <a href={log.entityUrl} className="entity-link" onClick={(e) => handleEntityClick(log, e)} style={{ cursor: "pointer" }}>
                        {log.entityKey}
                      </a>
                    ) : log.entityKey ? (
                      <span className="entity-key">{log.entityKey}</span>
                    ) : null}
                    {log.entityName && <span className="entity-name">{log.entityName}</span>}
                  </div>
                  <div className="timeline-time">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
