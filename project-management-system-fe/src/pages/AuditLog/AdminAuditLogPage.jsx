import React, { useEffect, useState } from "react";
import { getProjectAuditOverview, getProjectAuditLogs } from "../../services/auditLogService";
import { getProjects } from "../../services/projectService";
import performanceService from "../../services/performanceService";
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
  const [viewMode, setViewMode] = useState("teams"); // "teams" or "members"
  const [selectedTeam, setSelectedTeam] = useState(null); // Selected team for member view
  const [teamStats, setTeamStats] = useState({}); // Team statistics
  const [memberStats, setMemberStats] = useState({}); // Member statistics
  const [pmStats, setPmStats] = useState({}); // PM statistics (keyed by PM userId)

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

      console.log("Projects loaded:", availableProjects.length);
      console.log("First project sample:", availableProjects[0]);
      console.log("First project teams:", availableProjects[0]?.teams);

      // Admin thì xem tất cả
      // Non-admin: Backend đã filter projects (PM, Leader, Member)
      // Nhưng Audit Log page chỉ cho phép Admin, PM, và Leader
      if (user.role !== "admin") {
        availableProjects = availableProjects.filter((project) => {
          // Check if PM
          const isPM = project.members?.some(
            (member) => (member.userId._id === user._id || member.userId === user._id) && member.role === "PROJECT_MANAGER"
          );

          // Check if Leader
          const isLeader = project.teams?.some((team) => team.leaderId._id === user._id || team.leaderId === user._id);

          return isPM || isLeader;
        });

        // Nếu không có project nào mà user là PM hoặc Leader, redirect về dashboard
        if (availableProjects.length === 0) {
          alert("Bạn không có quyền truy cập trang này. Chỉ Admin, Project Manager và Team Leader mới có thể xem Audit Log.");
          navigate("/dashboard");
          return;
        }
      }

      setProjects(availableProjects);
      if (!selectedProjectId && availableProjects.length > 0) {
        setSelectedProjectId(availableProjects[0]._id || availableProjects[0].id);
      }
    });
  }, [user, navigate, selectedProjectId]);

  // Fetch team statistics when project is selected
  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchTeamStats = async () => {
      try {
        console.log("Fetching team stats for project:", selectedProjectId);
        const response = await performanceService.getTeamProgress(selectedProjectId);
        console.log("Team stats response:", response);
        const statsData = response.data?.data || response.data || {};
        console.log("Team stats data:", statsData);
        setTeamStats(statsData);
      } catch (error) {
        console.error("Error fetching team stats:", error);
        setTeamStats({});
      }
    };

    fetchTeamStats();
  }, [selectedProjectId]);

  // Fetch PM statistics when project is selected
  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchPMStats = async () => {
      try {
        const currentProject = projects.find((p) => (p._id || p.id) === selectedProjectId);
        if (!currentProject) return;

        const projectManagers = (currentProject.members || []).filter((m) => m.role === "PROJECT_MANAGER").map((m) => m.userId);

        const stats = {};
        for (const pm of projectManagers) {
          const pmId = pm._id || pm;
          console.log("Fetching stats for PM:", pmId);
          try {
            const response = await performanceService.getUserPerformance(pmId, selectedProjectId);
            console.log("PM performance response:", response);
            const perfData = response.data || response;
            console.log("PM performance data:", perfData);

            // Map from backend structure to expected format
            const summary = perfData.summary || {};
            stats[pmId] = {
              tasksAssigned: summary.totalTasks || 0,
              tasksCompleted: summary.completedTasks || 0,
              totalTime: summary.totalActualTime || 0,
              completionRate: summary.totalTasks > 0 ? Math.round((summary.completedTasks / summary.totalTasks) * 100) : 0,
            };
            console.log("PM stats set:", stats[pmId]);
          } catch (error) {
            console.error(`Error fetching PM stats for ${pmId}:`, error);
            stats[pmId] = { tasksAssigned: 0, tasksCompleted: 0, totalTime: 0, completionRate: 0 };
          }
        }
        console.log("All PM stats:", stats);
        setPmStats(stats);
      } catch (error) {
        console.error("Error fetching PM stats:", error);
        setPmStats({});
      }
    };

    fetchPMStats();
  }, [selectedProjectId, projects]);

  // Fetch member statistics when team is selected
  useEffect(() => {
    if (!selectedTeam || !selectedProjectId) return;

    const fetchMemberStats = async () => {
      try {
        const teamId = selectedTeam.teamId?._id || selectedTeam._id;
        console.log("Fetching member stats for team:", teamId);
        const response = await performanceService.getMemberProgress(selectedProjectId, teamId);
        console.log("Member stats response:", response);
        const statsData = response.data?.data || response.data || {};
        console.log("Member stats data:", statsData);
        setMemberStats(statsData);
      } catch (error) {
        console.error("Error fetching member stats:", error);
        setMemberStats({});
      }
    };

    fetchMemberStats();
  }, [selectedTeam, selectedProjectId]);

  // Get current project data
  const getCurrentProject = () => {
    return projects.find((p) => (p._id || p.id) === selectedProjectId);
  };

  // Determine user's role in the project
  const getUserRoleInProject = () => {
    if (!user) return null;
    if (user.role === "admin") return "admin";

    const currentProject = getCurrentProject();
    if (!currentProject) return null;

    // Check if PM
    const isPM = currentProject.members?.some(
      (member) => (member.userId._id === user._id || member.userId === user._id) && member.role === "PROJECT_MANAGER"
    );

    if (isPM) return "PM";

    // Check if Leader
    const isLeader = currentProject.teams?.some((team) => team.leaderId._id === user._id || team.leaderId === user._id);

    if (isLeader) return "LEADER";

    return null;
  };

  // Render team/member activity based on role
  const renderTeamMemberActivity = () => {
    const userRole = getUserRoleInProject();
    const currentProject = getCurrentProject();

    if (!currentProject) {
      return <div className="no-data">No project selected</div>;
    }

    // For Admin and PM: Show teams or members based on viewMode
    if (userRole === "admin" || userRole === "PM") {
      if (viewMode === "teams") {
        return renderTeamCards(currentProject);
      } else {
        return renderMemberCards(currentProject);
      }
    }

    // For Leader: Show only their team members
    if (userRole === "LEADER") {
      const leaderTeam = currentProject.teams?.find((team) => (team.leaderId._id || team.leaderId) === user._id);

      if (!leaderTeam) {
        return <div className="no-data">No team found</div>;
      }

      // Auto-set the team for leader if not already set
      if (!selectedTeam || (selectedTeam.teamId?._id || selectedTeam._id) !== (leaderTeam.teamId?._id || leaderTeam._id)) {
        setTimeout(() => setSelectedTeam(leaderTeam), 0);
      }

      return renderLeaderMemberCards(leaderTeam);
    }

    return <div className="no-data">No permission to view this section</div>;
  };

  // Render team cards for Admin/PM
  const renderTeamCards = (project) => {
    const teams = project.teams || [];
    const projectManagers = (project.members || []).filter((m) => m.role === "PROJECT_MANAGER").map((m) => m.userId);

    console.log("Rendering team cards for project:", project.name);
    console.log("Teams data:", teams);
    console.log("Project Managers:", projectManagers);

    if (teams.length === 0 && projectManagers.length === 0) {
      return (
        <div className="no-data">
          <p>No teams or project managers found in this project.</p>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>Please add teams to this project in Project Settings.</p>
        </div>
      );
    }

    return (
      <div className="team-cards-grid">
        {/* PM Cards */}
        {projectManagers.map((pm) => {
          const pmId = pm._id || pm;
          const pmName = pm.fullname || pm.name || "Project Manager";
          const pmAvatar = pm.avatar;
          const stats = pmStats[pmId] || { tasksAssigned: 0, tasksCompleted: 0, totalTime: 0, completionRate: 0 };
          const completionRate = stats.completionRate || 0;

          return (
            <div
              key={`pm-${pmId}`}
              className="team-card pm-card clickable"
              onClick={() => {
                setSelectedUser({
                  userId: pmId,
                  name: pmName,
                  avatar: pmAvatar,
                });
              }}
            >
              <div className="team-header pm-header">
                <div className="pm-badge">PM</div>
                <h4>{pmName}</h4>
              </div>
              <div className="pm-avatar-section">
                {pmAvatar ? (
                  <img src={pmAvatar} alt={pmName} className="pm-avatar" />
                ) : (
                  <div className="pm-avatar-placeholder">{pmName?.[0] || "P"}</div>
                )}
              </div>
              <div className="team-stats-summary">
                <div className="stat-row">
                  <span className="stat-label">Tasks:</span>
                  <span className="stat-value">
                    {stats.tasksCompleted} / {stats.tasksAssigned}
                  </span>
                </div>
                <div className="progress-bar-mini">
                  <div className="progress-fill-mini" style={{ width: `${completionRate}%` }}></div>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Time Logged:</span>
                  <span className="stat-value">{stats.totalTime || 0}h</span>
                </div>
              </div>
              <div className="view-team-btn">
                <span className="material-symbols-outlined">person</span>
                View Performance
              </div>
            </div>
          );
        })}
        {/* Team Cards */}
        {teams.map((team) => {
          const teamId = team.teamId?._id || team._id;
          const teamName = team.teamId?.name || "Unknown Team";
          const stats = teamStats[teamId] || { totalTasks: 0, completedTasks: 0, totalTime: 0 };
          const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

          console.log(`Team ${teamName} stats:`, stats);

          return (
            <div
              key={teamId}
              className="team-card clickable"
              onClick={() => {
                setSelectedTeam(team);
                setViewMode("members");
                setUserPage(1);
              }}
            >
              <div className="team-header">
                <h4>{teamName}</h4>
                <span className="member-count-badge">{team.members?.length || 0} members</span>
              </div>
              <div className="team-leader">
                <span className="label">Leader:</span>
                <span className="value">{team.leaderId?.fullname || "N/A"}</span>
              </div>
              <div className="team-stats-summary">
                <div className="stat-row">
                  <span className="stat-label">Tasks:</span>
                  <span className="stat-value">
                    {stats.completedTasks} / {stats.totalTasks}
                  </span>
                </div>
                <div className="progress-bar-mini">
                  <div className="progress-fill-mini" style={{ width: `${completionRate}%` }}></div>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Time Logged:</span>
                  <span className="stat-value">{stats.totalTime || 0}h</span>
                </div>
              </div>
              <div className="view-team-btn">
                <span className="material-symbols-outlined">arrow_forward</span>
                View Members
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render member cards for selected team (Admin/PM view)
  const renderMemberCards = (project) => {
    if (!selectedTeam) return null;

    // Get team members
    let members = [...(selectedTeam.members || [])];

    // Add leader if not already in members
    const leader = selectedTeam.leaderId;
    if (leader) {
      const leaderId = leader._id || leader;
      const leaderExists = members.some((m) => (m._id || m) === leaderId);
      if (!leaderExists) {
        members.unshift(leader); // Add leader at the beginning
      }
    }

    // DO NOT add PM to team member list - PM has their own card

    const paginatedMembers = members.slice((userPage - 1) * usersPerPage, userPage * usersPerPage);

    return (
      <>
        {members.length > usersPerPage && (
          <div className="user-pagination-nav">
            <button className="nav-btn" disabled={userPage === 1} onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="page-indicator">
              {userPage} / {Math.ceil(members.length / usersPerPage)}
            </span>
            <button
              className="nav-btn"
              disabled={userPage >= Math.ceil(members.length / usersPerPage)}
              onClick={() => setUserPage((prev) => prev + 1)}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        )}
        <div className="user-stats-grid">
          {paginatedMembers.map((member) => {
            const memberId = member._id || member;

            return (
              <div
                key={memberId}
                className="user-stat-item clickable-user"
                onClick={() => {
                  setSelectedUser({
                    userId: memberId,
                    name: member.fullname || member.name,
                    avatar: member.avatar,
                  });
                }}
              >
                <div className="user-avatar">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.fullname} />
                  ) : (
                    <div className="avatar-placeholder">{member.fullname?.[0] || "?"}</div>
                  )}
                </div>
                <div className="user-info">
                  <div className="user-name">{member.fullname || "Unknown"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // Render member cards for Leader's team
  const renderLeaderMemberCards = (team) => {
    // Get team members
    let members = [...(team.members || [])];

    // Add leader if not already in members
    const leader = team.leaderId;
    if (leader) {
      const leaderId = leader._id || leader;
      const leaderExists = members.some((m) => (m._id || m) === leaderId);
      if (!leaderExists) {
        members.unshift(leader); // Add leader at the beginning
      }
    }

    // DO NOT add PM to leader's team member list

    const paginatedMembers = members.slice((userPage - 1) * usersPerPage, userPage * usersPerPage);

    return (
      <>
        {members.length > usersPerPage && (
          <div className="user-pagination-nav">
            <button className="nav-btn" disabled={userPage === 1} onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="page-indicator">
              {userPage} / {Math.ceil(members.length / usersPerPage)}
            </span>
            <button
              className="nav-btn"
              disabled={userPage >= Math.ceil(members.length / usersPerPage)}
              onClick={() => setUserPage((prev) => prev + 1)}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        )}
        <div className="user-stats-grid">
          {paginatedMembers.map((member) => {
            const memberId = member._id || member;

            // Fetch member stats if not already loaded
            if (!memberStats[memberId]) {
              const teamId = team.teamId?._id || team._id;
              performanceService
                .getMemberProgress(selectedProjectId, teamId, memberId)
                .then((response) => {
                  setMemberStats((prev) => ({
                    ...prev,
                    [memberId]: response.data?.[memberId] || { tasksAssigned: 0, tasksCompleted: 0, totalTime: 0, completionRate: 0 },
                  }));
                })
                .catch((err) => console.error("Error fetching member stats:", err));
            }

            return (
              <div
                key={memberId}
                className="user-stat-item clickable-user"
                onClick={() => {
                  setSelectedUser({
                    userId: memberId,
                    name: member.fullname || member.name,
                    avatar: member.avatar,
                  });
                }}
              >
                <div className="user-avatar">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.fullname} />
                  ) : (
                    <div className="avatar-placeholder">{member.fullname?.[0] || "?"}</div>
                  )}
                </div>
                <div className="user-info">
                  <div className="user-name">{member.fullname || "Unknown"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

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
          {viewMode === "members" && selectedTeam && (
            <button
              className="back-to-teams-btn"
              onClick={() => {
                setViewMode("teams");
                setSelectedTeam(null);
                setUserPage(1);
              }}
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Back to Teams
            </button>
          )}
        </div>
        {renderTeamMemberActivity()}
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
