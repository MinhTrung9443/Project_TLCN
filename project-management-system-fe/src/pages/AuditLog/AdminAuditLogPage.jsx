import React, { useEffect, useState } from "react";
import { getProjectAuditOverview, getProjectAuditLogs } from "../../services/auditLogService";
import { getProjects } from "../../services/projectService";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import PerformancePanel from "../../components/common/PerformancePanel";
import "../../styles/AdminAuditLog.css";

const AdminAuditLogPage = ({ projectId: initialProjectId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || "");
  const [overview, setOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedUser, setSelectedUser] = useState(null); // For performance panel
  const [userPage, setUserPage] = useState(1); // Pagination for team members
  const [usersPerPage] = useState(6); // Show 6 members at a time

  // Kiểm tra quyền truy cập - Chỉ admin và PM được xem
  useEffect(() => {
    if (!user) return;

    // Nếu không phải admin, kiểm tra xem có phải PM của project nào không
    if (user.role !== "admin") {
      // Tạm thời cho phép truy cập, sẽ kiểm tra PM khi load projects
      // Nếu không có project nào mà user là PM, sẽ redirect về dashboard
    }
  }, [user]);

  // Lấy danh sách project và filter theo role
  useEffect(() => {
    if (!user) return;

    getProjects().then((res) => {
      let availableProjects = res.data || [];

      // Admin thì xem tất cả
      // Non-admin chỉ xem projects mà họ là PM
      if (user.role !== "admin") {
        availableProjects = availableProjects.filter((project) =>
          project.members?.some((member) => (member.userId._id === user._id || member.userId === user._id) && member.role === "PROJECT_MANAGER")
        );

        // Nếu không có project nào mà user là PM, redirect về dashboard
        if (availableProjects.length === 0) {
          alert("Bạn không có quyền truy cập trang này. Chỉ Admin và Project Manager mới có thể xem Audit Log.");
          navigate("/dashboard");
          return;
        }
      }

      setProjects(availableProjects);
      if (!selectedProjectId && availableProjects.length > 0) {
        setSelectedProjectId(availableProjects[0]._id || availableProjects[0].id);
      }
    });
  }, [user, navigate]);

  // Lấy dữ liệu auditlog khi đổi project hoặc page
  useEffect(() => {
    if (!selectedProjectId) {
      console.log("No project selected yet");
      return;
    }
    console.log("Fetching audit log for project:", selectedProjectId);
    setLoading(true);
    Promise.all([getProjectAuditOverview(selectedProjectId), getProjectAuditLogs(selectedProjectId, page, limit)])
      .then(([overviewRes, logsRes]) => {
        console.log("Overview response:", overviewRes);
        console.log("Logs response:", logsRes);
        // Backend trả về { success, data }
        const overviewData = overviewRes.data?.data || overviewRes.data;
        const logsData = logsRes.data?.data || logsRes.data;
        console.log("Processed overview data:", overviewData);
        console.log("Processed logs data:", logsData);
        setOverview(overviewData);
        setLogs(logsData);
      })
      .catch((err) => {
        console.error("Error loading audit log:", err);
        console.error("Error details:", err.response?.data);
        setOverview(null);
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, [selectedProjectId, page, limit]);

  if (loading) {
    return (
      <div className="audit-log-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading audit log data...</p>
        </div>
      </div>
    );
  }

  if (!overview)
    return (
      <div className="audit-log-container">
        <div className="no-data">No data available.</div>
      </div>
    );

  return (
    <div className="audit-log-container">
      {/* Header với project selector */}
      <div className="audit-header">
        <div className="header-content">
          <div>
            <h1 className="page-title">
              <span className="material-symbols-outlined">assessment</span>
              Audit Log Overview
            </h1>
            <p className="page-subtitle">Monitor project activity and team member changes</p>
          </div>
          <div className="project-selector">
            <label htmlFor="project-select">Project:</label>
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setPage(1);
              }}
            >
              {projects.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name} ({p.key || p._id || p.id})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <span className="material-symbols-outlined">activity_zone</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{overview.actionStats?.total || 0}</div>
            <div className="stat-label">Total Activities</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <span className="material-symbols-outlined">add_circle</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{overview.actionStats?.create || 0}</div>
            <div className="stat-label">Created</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <span className="material-symbols-outlined">edit</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{overview.actionStats?.update || 0}</div>
            <div className="stat-label">Updated</div>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <span className="material-symbols-outlined">delete</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{overview.actionStats?.delete || 0}</div>
            <div className="stat-label">Deleted</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Activity Chart */}
        <div className="chart-card">
          <h3 className="card-title">
            <span className="material-symbols-outlined">show_chart</span>
            Activity Trend (Last 7 Days)
          </h3>
          <div className="bar-chart">
            {Object.entries(overview.dayStats || {}).map(([day, count]) => {
              const maxCount = Math.max(...Object.values(overview.dayStats || {}), 1);
              const percentage = (count / maxCount) * 100;
              return (
                <div key={day} className="bar-item">
                  <div className="bar-label">{new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                  <div className="bar-container">
                    <div className="bar-fill" style={{ height: `${percentage}%` }} title={`${count} activities`}>
                      <span className="bar-value">{count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Entity Distribution */}
        <div className="chart-card">
          <h3 className="card-title">
            <span className="material-symbols-outlined">pie_chart</span>
            Activity by Entity Type
          </h3>
          <div className="entity-stats">
            {Object.entries(overview.entityStats || {}).map(([entity, count]) => {
              const total = overview.actionStats?.total || 1;
              const percentage = ((count / total) * 100).toFixed(1);
              return (
                <div key={entity} className="entity-item">
                  <div className="entity-info">
                    <span className="entity-name">{entity}</span>
                    <span className="entity-count">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Activity Section */}
      <div className="user-activity-card">
        <div className="card-header-with-nav">
          <h3 className="card-title">
            <span className="material-symbols-outlined">group</span>
            Team Member Activity
          </h3>
          {Object.values(overview.userStats || {}).filter((user) => user.userId && user.userId !== "unknown" && user.userId !== "undefined").length >
            usersPerPage && (
            <div className="user-pagination-nav">
              <button className="nav-btn" disabled={userPage === 1} onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <span className="page-indicator">
                {userPage} /{" "}
                {Math.ceil(
                  Object.values(overview.userStats || {}).filter((user) => user.userId && user.userId !== "unknown" && user.userId !== "undefined")
                    .length / usersPerPage
                )}
              </span>
              <button
                className="nav-btn"
                disabled={
                  userPage >=
                  Math.ceil(
                    Object.values(overview.userStats || {}).filter((user) => user.userId && user.userId !== "unknown" && user.userId !== "undefined")
                      .length / usersPerPage
                  )
                }
                onClick={() => setUserPage((prev) => prev + 1)}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
        </div>
        <div className="user-stats-grid">
          {Object.values(overview.userStats || {})
            .filter((user) => user.userId && user.userId !== "unknown" && user.userId !== "undefined")
            .slice((userPage - 1) * usersPerPage, userPage * usersPerPage)
            .map((user, idx) => {
              return (
                <div
                  key={idx}
                  className="user-stat-item clickable-user"
                  onClick={() => {
                    console.log("Clicked user:", user);
                    setSelectedUser({
                      userId: user.userId,
                      name: user.name,
                      avatar: user.avatar,
                    });
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="user-avatar">
                    {user.avatar ? <img src={user.avatar} alt={user.name} /> : <div className="avatar-placeholder">{user.name?.[0] || "?"}</div>}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-actions">
                      <span className="badge create">{user.actions?.create || 0} Created</span>
                      <span className="badge update">{user.actions?.update || 0} Updated</span>
                      <span className="badge delete">{user.actions?.delete || 0} Deleted</span>
                    </div>
                    <div className="total-actions">{user.count} total actions</div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="activity-feed-card">
        <h3 className="card-title">
          <span className="material-symbols-outlined">notifications_active</span>
          Recent Activity Feed
        </h3>
        <div className="activity-timeline">
          {(overview.activity || []).map((log, idx) => (
            <div key={idx} className="timeline-item">
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
          ))}
        </div>
      </div>

      {/* Detailed Logs Table */}
      <div className="logs-table-card">
        <h3 className="card-title">
          <span className="material-symbols-outlined">receipt_long</span>
          Detailed Audit Logs
        </h3>
        <div className="logs-table">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Record ID</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr key={idx}>
                  <td className="user-cell">
                    {log.userId?.avatar && <img src={log.userId.avatar} alt={log.userId.fullname} className="table-avatar" />}
                    <span>{log.userId?.fullname || "Unknown"}</span>
                  </td>
                  <td>
                    <span
                      className={`action-badge ${log.action?.includes("create") ? "create" : log.action?.includes("update") ? "update" : "delete"}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <strong>{log.tableName}</strong>
                  </td>
                  <td className="record-id">{log.recordId}</td>
                  <td className="timestamp">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <span className="material-symbols-outlined">chevron_left</span>
            Previous
          </button>
          <span className="page-info">Page {page}</span>
          <button className="pagination-btn" onClick={() => setPage(page + 1)} disabled={logs.length < limit}>
            Next
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Performance Panel */}
      {selectedUser && (
        <PerformancePanel
          userId={selectedUser.userId}
          userName={selectedUser.name}
          userAvatar={selectedUser.avatar}
          projectId={selectedProjectId}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

export default AdminAuditLogPage;
