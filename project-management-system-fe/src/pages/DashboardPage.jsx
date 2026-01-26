import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ProjectContext } from "../contexts/ProjectContext";
import { getDashboardOverview, getDashboardActivity } from "../services/dashboardService";
import { getProjectById } from "../services/projectService";
import sprintService from "../services/sprintService";
import { toast } from "react-toastify";

// New UI Components
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setProject } = useContext(ProjectContext);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([getDashboardOverview(), getDashboardActivity({ limit: 5 })])
      .then(([overviewRes]) => {
        setOverview(overviewRes.data);
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
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <LoadingSpinner size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      {/* Page Header */}
      <PageHeader
        icon="dashboard"
        badge="Productivity Hub"
        title={`Welcome back, ${user.fullname}!`}
        subtitle="Here's your productivity overview and recent activities"
        actions={
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <span className="material-symbols-outlined">calendar_today</span>
            <span>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        }
      />

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Tasks Card */}
            <Card hoverable>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-100">
                  <span className="material-symbols-outlined text-primary-700">assignment</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-600">Total Tasks</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{overview?.total ?? 0}</p>
                  <p className="text-xs text-neutral-500 mt-2">All tasks assigned to you</p>
                </div>
              </div>
            </Card>

            {/* Completed Tasks Card */}
            <Card hoverable>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-success-100">
                  <span className="material-symbols-outlined text-success-600">check_circle</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-600">Completed</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{overview?.done ?? 0}</p>
                  <p className="text-xs text-neutral-500 mt-2">Tasks successfully finished</p>
                </div>
              </div>
            </Card>

            {/* Upcoming Tasks Card */}
            <Card hoverable>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-warning-100">
                  <span className="material-symbols-outlined text-warning-600">schedule</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-600">Upcoming</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{overview?.upcomingTasks?.length ?? 0}</p>
                  <p className="text-xs text-neutral-500 mt-2">Tasks with approaching deadlines</p>
                </div>
              </div>
            </Card>

            {/* Overdue Tasks Card */}
            <Card hoverable>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-accent-100">
                  <span className="material-symbols-outlined text-accent-600">warning</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-600">Overdue</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{overview?.overdue ?? 0}</p>
                  <p className="text-xs text-neutral-500 mt-2">Tasks that need immediate attention</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card
              header={
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
                    <span className="material-symbols-outlined">event</span>
                    Upcoming Deadlines
                  </h3>
                  <Badge variant="primary">{overview?.upcomingTasks?.length ?? 0}</Badge>
                </div>
              }
            >
              <div className="divide-y divide-neutral-200">
                {!overview?.upcomingTasks || overview.upcomingTasks.length === 0 ? (
                  <EmptyState icon="task_alt" title="No upcoming tasks" description="All tasks are up to date" />
                ) : (
                  overview.upcomingTasks.map((task) => (
                    <div
                      key={task._id}
                      className="p-4 hover:bg-neutral-50 transition-colors cursor-pointer"
                      onClick={() => task.key && navigate(`/app/task/${task.key}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-neutral-900 truncate">{task.name}</div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-xs font-medium text-neutral-700 bg-neutral-100 px-2 py-1 rounded">
                              {task.projectId?.name || "Unknown Project"}
                            </span>
                            {task.statusId?.name && (
                              <Badge variant="primary" size="sm">
                                {task.statusId.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-neutral-600 whitespace-nowrap">
                          <span className="material-symbols-outlined text-sm">event</span>
                          <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline"}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card
              header={
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
                    <span className="material-symbols-outlined">trending_up</span>
                    Project Progress
                  </h3>
                  <Badge variant="success">{overview?.projectProgress?.length ?? 0}</Badge>
                </div>
              }
            >
              <div className="divide-y divide-neutral-200">
                {!overview?.projectProgress || overview.projectProgress.length === 0 ? (
                  <EmptyState icon="folder_off" title="No active projects" description="Projects you're involved in will appear here" />
                ) : (
                  overview.projectProgress.map((proj) => (
                    <div key={proj.projectKey} className="p-4 hover:bg-neutral-50 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="font-semibold text-neutral-900">{proj.project}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                            <span className="font-medium text-neutral-700 bg-neutral-100 px-2 py-1 rounded">{proj.role}</span>
                            {proj.endDate && (
                              <span className="flex items-center gap-1 text-neutral-600">
                                <span className="material-symbols-outlined text-sm">event</span>
                                {new Date(proj.endDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-primary-600">{proj.progress}%</div>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-300"
                          style={{ width: `${proj.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card
            header={
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
                  <span className="material-symbols-outlined">notifications_active</span>
                  Recent Activity
                </h3>
                <Badge variant="neutral">{overview?.recentActivity?.length ?? 0}</Badge>
              </div>
            }
          >
            <div className="divide-y divide-neutral-200">
              {!overview?.recentActivity || overview.recentActivity.length === 0 ? (
                <EmptyState icon="history" title="No recent activity" description="Activity logs will appear here as you work" />
              ) : (
                overview.recentActivity.map((log, idx) => (
                  <div key={log._id || idx} className="p-4 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                        {log.user.avatar ? (
                          <img src={log.user.avatar} alt={log.user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{log.user.name?.[0] || "?"}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-semibold text-neutral-900">{log.user.name}</span>
                          <span className="text-neutral-600 text-sm">{log.action}</span>
                          {log.entityUrl ? (
                            <button
                              onClick={(e) => handleEntityClick(log, e)}
                              className="text-primary-600 font-semibold hover:text-primary-700 transition-colors"
                            >
                              {log.entityKey}
                            </button>
                          ) : log.entityKey ? (
                            <span className="text-primary-600 font-semibold">{log.entityKey}</span>
                          ) : null}
                          {log.entityName && <span className="text-neutral-600 text-sm">{log.entityName}</span>}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
