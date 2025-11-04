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
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || loading) {
    return <div className="loading-container">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Welcome back, {user.fullname}!</h2>
        <p>Here's a summary of your projects and tasks.</p>
      </header>

      <div className="dashboard-cards">
        {/* Tổng quan nhanh */}
        <div className="dashboard-card">
          <div className="card-stat" style={{ color: "#2980db" }}>
            {overview?.doing ?? 0}
          </div>
          <h3>Tasks In Progress</h3>
          <p>Tasks you are currently working on.</p>
        </div>
        <div className="dashboard-card">
          <div className="card-stat" style={{ color: "#27ae60" }}>
            {overview?.done ?? 0}
          </div>
          <h3>Tasks Done</h3>
          <p>Tasks you have completed.</p>
        </div>
        <div className="dashboard-card">
          <div className="card-stat" style={{ color: "#e67e22" }}>
            {overview?.upcomingTasks?.length ?? 0}
          </div>
          <h3>Upcoming Deadlines</h3>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13 }}>
            {overview?.upcomingTasks?.length === 0 && <li>No upcoming tasks.</li>}
            {overview?.upcomingTasks?.map((task) => (
              <li key={task._id}>
                <b>{task.name}</b> ({task.status})
                <br />
                <span style={{ color: "#888" }}>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A"}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="dashboard-card">
          <div className="card-stat" style={{ color: "#c0392b" }}>
            {overview?.overdue ?? 0}
          </div>
          <h3>Overdue Tasks</h3>
          <p>Tasks that have passed their due date.</p>
        </div>

        {/* Tiến độ dự án */}
        <div className="dashboard-card" style={{ gridColumn: "span 2" }}>
          <h3>Project Progress</h3>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13 }}>
            {overview?.projectProgress?.length === 0 && <li>No active projects.</li>}
            {overview?.projectProgress?.map((proj) => (
              <li key={proj.projectKey}>
                <b>{proj.project}</b> ({proj.role})<span style={{ float: "right", color: "#2980db" }}>{proj.progress}%</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Thông báo gần đây */}
        <div className="dashboard-card" style={{ gridColumn: "span 2" }}>
          <h3>Recent Notifications</h3>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13 }}>
            {overview?.notifications?.length === 0 && <li>No notifications.</li>}
            {overview?.notifications?.map((noti, idx) => (
              <li key={noti._id || idx}>
                <b>{noti.action}</b> - {noti.tableName} {noti.recordId ? `#${noti.recordId}` : ""}
                <br />
                <span style={{ color: "#888" }}>{new Date(noti.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent Activity feed - hiển thị đúng format UI */}
        <div className="dashboard-card" style={{ gridColumn: "span 2" }}>
          <h3>Recent Activity</h3>
          <ul style={{ paddingLeft: 0, margin: 0, fontSize: 13, listStyle: "none" }}>
            {(!overview?.recentActivity || overview.recentActivity.length === 0) && <li>No recent activity.</li>}
            {overview?.recentActivity?.map((log, idx) => (
              <li key={log._id || idx} style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                {/* Avatar */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#e0e0e0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    marginRight: 10,
                  }}
                >
                  {log.user.avatar ? (
                    <img src={log.user.avatar} alt={log.user.name} style={{ width: 32, height: 32, borderRadius: "50%" }} />
                  ) : (
                    <span>{log.user.name?.[0] || "?"}</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500, color: "#1976d2" }}>{log.user.name}</span>
                  &nbsp;<span style={{ color: "#444" }}>{log.action}</span>
                  {log.entityUrl ? (
                    <>
                      &nbsp;
                      <a href={log.entityUrl} style={{ color: "#d32f2f", fontWeight: 500, textDecoration: "none" }}>
                        {log.entityKey}
                      </a>
                    </>
                  ) : null}
                  {log.entityName && (
                    <>
                      &nbsp;<span style={{ color: "#333" }}>{log.entityName}</span>
                    </>
                  )}
                  {log.entityStatus && (
                    <span style={{ marginLeft: 8, background: "#eee", borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 500 }}>
                      {log.entityStatus}
                    </span>
                  )}
                  <br />
                  <span style={{ color: "#888", fontSize: 12 }}>{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
