import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getDashboardOverview, getDashboardActivity } from "../services/dashboardService";
import "../styles/pages/DashboardPage.css";

const DashboardPage = () => {
  const { user } = useAuth();
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
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="welcome-title">
              <span className="material-symbols-outlined">dashboard</span>
              Welcome back, {user.fullname}!
            </h1>
            <p className="welcome-subtitle">Here's your productivity overview and recent activities</p>
          </div>
          <div className="header-date">
            <span className="material-symbols-outlined">calendar_today</span>
            <span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{overview?.doing ?? 0}</div>
            <div className="stat-label">In Progress</div>
            <div className="stat-description">Tasks currently being worked on</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{overview?.done ?? 0}</div>
            <div className="stat-label">Completed</div>
            <div className="stat-description">Tasks successfully finished</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <span className="material-symbols-outlined">schedule</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{overview?.upcomingTasks?.length ?? 0}</div>
            <div className="stat-label">Upcoming</div>
            <div className="stat-description">Tasks with approaching deadlines</div>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{overview?.overdue ?? 0}</div>
            <div className="stat-label">Overdue</div>
            <div className="stat-description">Tasks past their deadline</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Upcoming Tasks */}
        <div className="dashboard-card upcoming-tasks">
          <h3 className="card-title">
            <span className="material-symbols-outlined">event</span>
            Upcoming Deadlines
          </h3>
          <div className="upcoming-tasks-list">
            {!overview?.upcomingTasks || overview.upcomingTasks.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">task_alt</span>
                <p>No upcoming tasks</p>
              </div>
            ) : (
              overview.upcomingTasks.map((task) => (
                <div key={task._id} className="upcoming-task-item">
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

        {/* Project Progress */}
        <div className="dashboard-card project-progress">
          <h3 className="card-title">
            <span className="material-symbols-outlined">trending_up</span>
            Project Progress
          </h3>
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
                      <div className="project-role">{proj.role}</div>
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

      {/* Recent Activity */}
      <div className="dashboard-card activity-feed">
        <h3 className="card-title">
          <span className="material-symbols-outlined">notifications_active</span>
          Recent Activity
        </h3>
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
                      <a href={log.entityUrl} className="entity-link">
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
