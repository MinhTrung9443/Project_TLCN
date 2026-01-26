import React, { useEffect, useState } from "react";
import { getProjectAuditOverview, getProjectAuditLogs } from "../../services/auditLogService";
import { getProjects } from "../../services/projectService";
import performanceService from "../../services/performanceService";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import PerformancePanel from "../../components/common/PerformancePanel";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

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
            (member) => (member.userId._id === user._id || member.userId === user._id) && member.role === "PROJECT_MANAGER",
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
      (member) => (member.userId._id === user._id || member.userId === user._id) && member.role === "PROJECT_MANAGER",
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
      return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">No project selected</div>;
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
        return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">No team found</div>;
      }

      // Auto-set the team for leader if not already set
      if (!selectedTeam || (selectedTeam.teamId?._id || selectedTeam._id) !== (leaderTeam.teamId?._id || leaderTeam._id)) {
        setTimeout(() => setSelectedTeam(leaderTeam), 0);
      }

      return renderLeaderMemberCards(leaderTeam);
    }

    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        No permission to view this section
      </div>
    );
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
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p>No teams or project managers found in this project.</p>
          <p className="text-xs text-slate-500 mt-1">Please add teams to this project in Project Settings.</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
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
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
              onClick={() => {
                setSelectedUser({
                  userId: pmId,
                  name: pmName,
                  avatar: pmAvatar,
                });
              }}
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center font-semibold">PM</div>
                <div>
                  <h4 className="text-slate-900 font-semibold">{pmName}</h4>
                  <p className="text-xs text-slate-500">Project Manager</p>
                </div>
                <div className="ml-auto">
                  {pmAvatar ? (
                    <img src={pmAvatar} alt={pmName} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-semibold">
                      {(pmName?.[0] || "P").toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Tasks</span>
                  <span className="font-semibold text-slate-900">
                    {stats.tasksCompleted} / {stats.tasksAssigned}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${completionRate}%` }}></div>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Time Logged</span>
                  <span className="font-semibold text-slate-900">{stats.totalTime || 0}h</span>
                </div>
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-600">
                <span className="material-symbols-outlined text-base">person</span>
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

          return (
            <div
              key={teamId}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
              onClick={() => {
                setSelectedTeam(team);
                setViewMode("members");
                setUserPage(1);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-slate-900 font-semibold">{teamName}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">group</span>
                    {team.members?.length || 0} members
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  Leader: {team.leaderId?.fullname || "N/A"}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Tasks</span>
                  <span className="font-semibold text-slate-900">
                    {stats.completedTasks} / {stats.totalTasks}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-sky-500" style={{ width: `${completionRate}%` }}></div>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Time Logged</span>
                  <span className="font-semibold text-slate-900">{stats.totalTime || 0}h</span>
                </div>
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-600">
                <span className="material-symbols-outlined text-base">arrow_forward</span>
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
          <div className="flex items-center justify-between text-sm text-slate-700 mb-2">
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              disabled={userPage === 1}
              onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
              Prev
            </button>
            <span className="text-slate-500">
              {userPage} / {Math.ceil(members.length / usersPerPage)}
            </span>
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              disabled={userPage >= Math.ceil(members.length / usersPerPage)}
              onClick={() => setUserPage((prev) => prev + 1)}
            >
              Next
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {paginatedMembers.map((member) => {
            const memberId = member._id || member;

            return (
              <div
                key={memberId}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm hover:bg-white hover:shadow-md transition cursor-pointer"
                onClick={() => {
                  setSelectedUser({
                    userId: memberId,
                    name: member.fullname || member.name,
                    avatar: member.avatar,
                  });
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.fullname} className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-slate-700 font-semibold">{member.fullname?.[0] || "?"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{member.fullname || "Unknown"}</div>
                    <div className="text-xs text-slate-500">Team Member</div>
                  </div>
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
          <div className="flex items-center justify-between text-sm text-slate-700 mb-2">
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              disabled={userPage === 1}
              onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
              Prev
            </button>
            <span className="text-slate-500">
              {userPage} / {Math.ceil(members.length / usersPerPage)}
            </span>
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              disabled={userPage >= Math.ceil(members.length / usersPerPage)}
              onClick={() => setUserPage((prev) => prev + 1)}
            >
              Next
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm hover:bg-white hover:shadow-md transition cursor-pointer"
                onClick={() => {
                  setSelectedUser({
                    userId: memberId,
                    name: member.fullname || member.name,
                    avatar: member.avatar,
                  });
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.fullname} className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-slate-700 font-semibold">{member.fullname?.[0] || "?"}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{member.fullname || "Unknown"}</div>
                    <div className="text-xs text-slate-500">Team Member</div>
                  </div>
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm text-slate-700">
          <span className="material-symbols-outlined animate-spin text-sky-600">progress_activity</span>
          Loading audit log data...
        </div>
      </div>
    );
  }

  if (!overview)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm">No data available.</div>
      </div>
    );

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-600">
            <span className="material-symbols-outlined text-base">assessment</span>
            Audit Log
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Audit Log & Performance</h1>
              <p className="text-slate-500 text-sm mt-1">Monitor activities, team performance, and track changes in real time.</p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <label htmlFor="project-select" className="text-xs font-semibold text-slate-500 tracking-wide">
                PROJECT
              </label>
              <select
                id="project-select"
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setPage(1);
                }}
                className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {projects.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Total Activities",
                value: overview.actionStats?.total || 0,
                icon: "activity_zone",
                color: "text-sky-600",
                bg: "bg-sky-50",
              },
              {
                label: "Created",
                value: overview.actionStats?.create || 0,
                icon: "add_circle",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                label: "Updated",
                value: overview.actionStats?.update || 0,
                icon: "edit",
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
              {
                label: "Deleted",
                value: overview.actionStats?.delete || 0,
                icon: "delete",
                color: "text-rose-600",
                bg: "bg-rose-50",
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className={`h-10 w-10 rounded-lg ${item.bg} flex items-center justify-center ${item.color}`}>
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="text-lg font-semibold text-slate-900">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <span className="material-symbols-outlined text-xl text-sky-600">show_chart</span>
              Activity Trend (Last 7 Days)
            </div>
            <div className="grid grid-cols-7 gap-3 items-end">
              {Object.entries(overview.dayStats || {}).map(([day, count]) => {
                const maxCount = Math.max(...Object.values(overview.dayStats || {}), 1);
                const percentage = (count / maxCount) * 100;
                return (
                  <div key={day} className="flex flex-col items-center gap-2">
                    <div className="w-full rounded-lg bg-slate-100 h-32 overflow-hidden">
                      <div
                        className="bg-sky-500 w-full text-center text-white text-xs font-semibold flex items-end justify-center"
                        style={{ height: `${percentage}%` }}
                      >
                        <span className="pb-1">{count}</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 text-center whitespace-nowrap">
                      {new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <span className="material-symbols-outlined text-xl text-sky-600">pie_chart</span>
              Activity by Entity
            </div>
            <div className="space-y-3">
              {Object.entries(overview.entityStats || {}).map(([entity, count]) => {
                const total = overview.actionStats?.total || 1;
                const percentage = ((count / total) * 100).toFixed(1);
                return (
                  <div key={entity} className="space-y-1">
                    <div className="flex items-center justify-between text-sm text-slate-800">
                      <span className="font-semibold">{entity}</span>
                      <span className="text-slate-500">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-sky-500" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Export */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-sky-600">file_download</span>
                Export Performance Report
              </h3>
              <p className="text-sm text-slate-500">Generate detailed performance data to Excel.</p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={exportToExcel}
              disabled={isExporting || !exportStartDate || !exportEndDate}
            >
              {isExporting ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  Exporting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">download</span>
                  Export to Excel
                </>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm text-slate-600 flex flex-col gap-1">
              From
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="text-sm text-slate-600 flex flex-col gap-1">
              To
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>
        </div>

        {/* Team performance */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-sky-600">group</span>
              Team Performance
            </h3>
            {viewMode === "members" && selectedTeam && (
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setViewMode("teams");
                  setSelectedTeam(null);
                  setUserPage(1);
                }}
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back to Teams
              </button>
            )}
          </div>
          {renderTeamMemberActivity()}
        </div>

        {/* Logs */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-sky-600">receipt_long</span>
              Detailed Audit Logs
            </h3>
            {(filterUserId || filterAction || filterEntity) && (
              <button
                className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-800"
                onClick={() => {
                  setFilterUserId("");
                  setFilterAction("");
                  setFilterEntity("");
                  setPage(1);
                }}
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Clear filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="text-sm text-slate-600 flex flex-col gap-1">
              User
              <select
                value={filterUserId}
                onChange={(e) => {
                  setFilterUserId(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="">All Users</option>
                {overview?.userStats &&
                  Object.entries(overview.userStats).map(([userId, userData]) => (
                    <option key={userId} value={userId}>
                      {userData.name || "Unknown"}
                    </option>
                  ))}
              </select>
            </label>

            <label className="text-sm text-slate-600 flex flex-col gap-1">
              Action
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </label>

            <label className="text-sm text-slate-600 flex flex-col gap-1">
              Entity Type
              <select
                value={filterEntity}
                onChange={(e) => {
                  setFilterEntity(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
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
            </label>
          </div>

          {loadingLogs ? (
            <div className="flex items-center justify-center py-10 text-slate-500">Loading audit logs...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 text-xs uppercase tracking-wide">
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Entity Type</th>
                    <th className="px-3 py-2">Record</th>
                    <th className="px-3 py-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-slate-500" colSpan="5">
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-3 text-slate-800 flex items-center gap-3">
                          {log.userId?.avatar && (
                            <img src={log.userId.avatar} alt={log.userId.fullname} className="h-8 w-8 rounded-full object-cover" />
                          )}
                          <span>{log.userId?.fullname || "Unknown"}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                              log.action?.includes("create")
                                ? "bg-emerald-50 text-emerald-700"
                                : log.action?.includes("update")
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            <span className="material-symbols-outlined text-base">
                              {log.action?.includes("create") ? "add_circle" : log.action?.includes("update") ? "edit" : "delete"}
                            </span>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{log.tableName}</span>
                        </td>
                        <td className="px-3 py-3 text-slate-800">{log.recordName || log.recordId || "-"}</td>
                        <td className="px-3 py-3 text-slate-600">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
                Previous
              </button>
              <span className="text-slate-500">Page {page}</span>
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                onClick={() => setPage(page + 1)}
                disabled={logs.length < limit}
              >
                Next
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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
