import React, { useEffect, useState } from "react";
import { getProjectAuditOverview, getProjectAuditLogs } from "../../services/auditLogService";
import { getProjects } from "../../services/projectService";
import performanceService from "../../services/performanceService";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import PerformancePanel from "../../components/common/PerformancePanel";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import "../../styles/AdminAuditLog.css";

const AdminAuditLogPage = ({ projectId: initialProjectId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || "");
  const [overview, setOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedUser, setSelectedUser] = useState(null); // For performance panel
  const [userPage, setUserPage] = useState(1); // Pagination for team members
  const [usersPerPage] = useState(6); // Show 6 members at a time
  const [viewMode, setViewMode] = useState("teams"); // "teams" or "members"
  const [selectedTeam, setSelectedTeam] = useState(null); // Selected team for member view
  const [teamStats, setTeamStats] = useState({}); // Team statistics
  const [memberStats, setMemberStats] = useState({}); // Member statistics
  const [pmStats, setPmStats] = useState({}); // PM statistics (keyed by PM userId)

  // Filters for audit logs
  const [filterUserId, setFilterUserId] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");

  // Date range for export
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

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
          navigate("/app/dashboard");
          return;
        }
      }

      setProjects(availableProjects);
      if (!selectedProjectId && availableProjects.length > 0) {
        setSelectedProjectId(availableProjects[0]._id || availableProjects[0].id);
      }
    });
  }, [user, navigate, selectedProjectId]);

  // Set default export dates based on selected project
  useEffect(() => {
    if (!selectedProjectId || projects.length === 0) return;

    const currentProject = projects.find((p) => (p._id || p.id) === selectedProjectId);
    if (!currentProject) return;

    // Format dates to YYYY-MM-DD for date input
    const formatDate = (date) => {
      if (!date) return "";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split("T")[0];
    };

    const startDate = formatDate(currentProject.startDate);
    const endDate = formatDate(currentProject.endDate);

    if (startDate) setExportStartDate(startDate);
    if (endDate) setExportEndDate(endDate);
  }, [selectedProjectId, projects]);

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
                <div className="pm-avatar-section">
                  {pmAvatar ? (
                    <img src={pmAvatar} alt={pmName} className="pm-avatar" />
                  ) : (
                    <div className="pm-avatar-placeholder">{(pmName?.[0] || "P").toUpperCase()}</div>
                  )}
                </div>
                <h4>{pmName}</h4>
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

  // Lấy dữ liệu overview khi đổi project
  useEffect(() => {
    if (!selectedProjectId) {
      console.log("No project selected yet");
      return;
    }
    console.log("Fetching overview for project:", selectedProjectId);
    setLoading(true);

    getProjectAuditOverview(selectedProjectId)
      .then((overviewRes) => {
        console.log("Overview response:", overviewRes);
        const overviewData = overviewRes.data?.data || overviewRes.data;
        console.log("Processed overview data:", overviewData);
        setOverview(overviewData);
      })
      .catch((err) => {
        console.error("Error loading overview:", err);
        setOverview(null);
      })
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  // Lấy dữ liệu logs khi đổi project, page hoặc filters
  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }
    console.log("Fetching logs for project:", selectedProjectId);
    setLoadingLogs(true);

    const filters = {};
    if (filterUserId) filters.userId = filterUserId;
    if (filterAction) filters.action = filterAction;
    if (filterEntity) filters.tableName = filterEntity;

    getProjectAuditLogs(selectedProjectId, page, limit, filters)
      .then((logsRes) => {
        console.log("Logs response:", logsRes);
        const logsData = logsRes.data?.data || logsRes.data;
        console.log("Processed logs data:", logsData);
        setLogs(logsData);
      })
      .catch((err) => {
        console.error("Error loading logs:", err);
        setLogs([]);
      })
      .finally(() => setLoadingLogs(false));
  }, [selectedProjectId, page, limit, filterUserId, filterAction, filterEntity]);

  // Export to Excel function
  const exportToExcel = async () => {
    if (!selectedProjectId) {
      toast.error("Please select a project first");
      return;
    }

    if (!exportStartDate || !exportEndDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(exportStartDate) > new Date(exportEndDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    try {
      setIsExporting(true);
      const currentProject = getCurrentProject();

      if (!currentProject) {
        toast.error("Project not found");
        return;
      }

      // Collect all members from all teams
      const allMembers = new Map();

      // Get all teams and their members
      for (const team of currentProject.teams || []) {
        const teamId = team.teamId?._id || team._id;
        const teamName = team.teamId?.name || "Unknown Team";

        // Get members from team
        const members = [...(team.members || [])];

        // Add leader if not in members
        const leader = team.leaderId;
        if (leader) {
          const leaderId = leader._id || leader;
          const leaderExists = members.some((m) => (m._id || m) === leaderId);
          if (!leaderExists) {
            members.unshift(leader);
          }
        }

        // Fetch performance for each member
        for (const member of members) {
          const memberId = member._id || member;

          if (!allMembers.has(memberId)) {
            try {
              const params = {
                startDate: exportStartDate,
                endDate: exportEndDate,
              };

              const response = await performanceService.getUserPerformance(memberId, selectedProjectId, params);
              console.log(`Response for member ${member.fullname || member.name}:`, response);
              const perfData = response.data || response;
              console.log("Perf data:", perfData);
              const summary = perfData.summary || {};
              console.log("Summary:", summary);

              allMembers.set(memberId, {
                fullname: member.fullname || member.name || "Unknown",
                team: teamName,
                totalTasks: summary.totalTasks || 0,
                completedTasks: summary.completedTasks || 0,
                inProgressTasks: summary.inProgressTasks || 0,
                todoTasks: summary.todoTasks || 0,
                estimatedTime: summary.totalEstimatedTime || 0,
                actualTime: summary.totalActualTime || 0,
                efficiency: summary.overallEfficiency !== null ? summary.overallEfficiency.toFixed(2) : "N/A",
                onTimePercentage: summary.onTimePercentage !== null ? summary.onTimePercentage.toFixed(2) : "N/A",
                onTimeCount: summary.onTimeCount || 0,
                tasksWithDueDate: summary.tasksWithDueDate || 0,
              });
            } catch (error) {
              console.error(`Error fetching performance for member ${memberId}:`, error);
              allMembers.set(memberId, {
                fullname: member.fullname || member.name || "Unknown",
                team: teamName,
                totalTasks: 0,
                completedTasks: 0,
                inProgressTasks: 0,
                todoTasks: 0,
                estimatedTime: 0,
                actualTime: 0,
                efficiency: "N/A",
                onTimePercentage: "N/A",
                onTimeCount: 0,
                tasksWithDueDate: 0,
              });
            }
          }
        }
      }

      // Also get PM performance
      const projectManagers = (currentProject.members || []).filter((m) => m.role === "PROJECT_MANAGER").map((m) => m.userId);

      for (const pm of projectManagers) {
        const pmId = pm._id || pm;
        const pmName = pm.fullname || pm.name || "Project Manager";

        if (!allMembers.has(pmId)) {
          try {
            const params = {
              startDate: exportStartDate,
              endDate: exportEndDate,
            };

            const response = await performanceService.getUserPerformance(pmId, selectedProjectId, params);
            console.log(`Response for PM ${pmName}:`, response);
            const perfData = response.data || response;
            console.log("PM Perf data:", perfData);
            const summary = perfData.summary || {};
            console.log("PM Summary:", summary);

            allMembers.set(pmId, {
              fullname: pmName,
              team: "Project Manager",
              totalTasks: summary.totalTasks || 0,
              completedTasks: summary.completedTasks || 0,
              inProgressTasks: summary.inProgressTasks || 0,
              todoTasks: summary.todoTasks || 0,
              estimatedTime: summary.totalEstimatedTime || 0,
              actualTime: summary.totalActualTime || 0,
              efficiency: summary.overallEfficiency !== null ? summary.overallEfficiency.toFixed(2) : "N/A",
              onTimePercentage: summary.onTimePercentage !== null ? summary.onTimePercentage.toFixed(2) : "N/A",
              onTimeCount: summary.onTimeCount || 0,
              tasksWithDueDate: summary.tasksWithDueDate || 0,
            });
          } catch (error) {
            console.error(`Error fetching performance for PM ${pmId}:`, error);
          }
        }
      }

      // Prepare data for Excel
      const excelData = [];
      let index = 1;

      for (const [memberId, data] of allMembers) {
        excelData.push({
          STT: index++,
          "Họ và Tên": data.fullname,
          Team: data.team,
          "Tasks Được Giao": data.totalTasks,
          "Tasks Hoàn Thành": data.completedTasks,
          "Tasks In Progress": data.inProgressTasks,
          "Tasks To Do": data.todoTasks,
          "Thời Gian Ước Tính (giờ)": data.estimatedTime.toFixed(2),
          "Thời Gian Thực Tế (giờ)": data.actualTime.toFixed(2),
          "Hiệu Suất (%)": data.efficiency,
          "Hoàn Thành Đúng Hạn": `${data.onTimeCount}/${data.tasksWithDueDate}`,
          "% Đúng Hạn": data.onTimePercentage !== "N/A" ? `${data.onTimePercentage}%` : "N/A",
        });
      }

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      ws["!cols"] = [
        { wch: 5 }, // STT
        { wch: 25 }, // Họ và Tên
        { wch: 20 }, // Team
        { wch: 15 }, // Tasks Được Giao
        { wch: 18 }, // Tasks Hoàn Thành
        { wch: 18 }, // Tasks In Progress
        { wch: 15 }, // Tasks To Do
        { wch: 22 }, // Thời Gian Ước Tính
        { wch: 22 }, // Thời Gian Thực Tế
        { wch: 18 }, // Hiệu Suất
        { wch: 20 }, // Hoàn Thành Đúng Hạn
        { wch: 15 }, // % Đúng Hạn
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Performance Report");

      // Generate filename
      const projectName = currentProject.name || "Project";
      const filename = `${projectName}_Performance_${exportStartDate}_to_${exportEndDate}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      toast.success("Excel file exported successfully!");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Failed to export to Excel");
    } finally {
      setIsExporting(false);
    }
  };

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

      {/* Export to Excel Section */}
      <div className="export-section-card">
        <div className="export-header">
          <h3 className="card-title">
            <span className="material-symbols-outlined">file_download</span>
            Export Performance Report
          </h3>
          <p className="export-subtitle">Export detailed team member performance data to Excel</p>
        </div>
        <div className="export-controls">
          <div className="export-date-range">
            <div className="export-date-group">
              <label htmlFor="exportStartDate">From:</label>
              <input
                type="date"
                id="exportStartDate"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="export-date-input"
              />
            </div>
            <div className="export-date-group">
              <label htmlFor="exportEndDate">To:</label>
              <input
                type="date"
                id="exportEndDate"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="export-date-input"
              />
            </div>
          </div>
          <button className="export-excel-btn" onClick={exportToExcel} disabled={isExporting || !exportStartDate || !exportEndDate}>
            {isExporting ? (
              <>
                <span className="spinner-small"></span>
                Exporting...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">download</span>
                Export to Excel
              </>
            )}
          </button>
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

      {/* Detailed Logs Table */}
      <div className="logs-table-card">
        <h3 className="card-title">
          <span className="material-symbols-outlined">receipt_long</span>
          Detailed Audit Logs
        </h3>

        {/* Filters */}
        <div className="audit-filters" style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>User</label>
            <select
              value={filterUserId}
              onChange={(e) => {
                setFilterUserId(e.target.value);
                setPage(1);
              }}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd" }}
            >
              <option value="">All Users</option>
              {overview?.userStats &&
                Object.entries(overview.userStats).map(([userId, userData]) => (
                  <option key={userId} value={userId}>
                    {userData.name || "Unknown"}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>Action</label>
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(1);
              }}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd" }}
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>

          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>Entity</label>
            <select
              value={filterEntity}
              onChange={(e) => {
                setFilterEntity(e.target.value);
                setPage(1);
              }}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd" }}
            >
              <option value="">All Entities</option>
              <option value="Task">Tasks</option>
              <option value="Sprint">Sprints</option>
              <option value="Project">Projects</option>
              <option value="Platform">Platforms</option>
              <option value="TaskType">Task Types</option>
              <option value="Priority">Priorities</option>
              <option value="TimeLog">Time Logs</option>
              <option value="Group">Groups</option>
              <option value="User">Users</option>
            </select>
          </div>

          {(filterUserId || filterAction || filterEntity) && (
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={() => {
                  setFilterUserId("");
                  setFilterAction("");
                  setFilterEntity("");
                  setPage(1);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  background: "#f5f5f5",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {loadingLogs ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p>Loading logs...</p>
          </div>
        ) : (
          <div className="logs-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Record</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                      No logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => (
                    <tr key={idx}>
                      <td className="user-cell">
                        {log.userId?.avatar && <img src={log.userId.avatar} alt={log.userId.fullname} className="table-avatar" />}
                        <span>{log.userId?.fullname || "Unknown"}</span>
                      </td>
                      <td>
                        <span
                          className={`action-badge ${
                            log.action?.includes("create") ? "create" : log.action?.includes("update") ? "update" : "delete"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <strong>{log.tableName}</strong>
                      </td>
                      <td className="record-id">{log.recordName || log.recordId || "-"}</td>
                      <td className="timestamp">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

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
          defaultStartDate={exportStartDate}
          defaultEndDate={exportEndDate}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

export default AdminAuditLogPage;
