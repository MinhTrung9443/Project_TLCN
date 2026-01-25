import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ProjectContext } from "../contexts/ProjectContext";
import { getDashboardOverview, getDashboardActivity } from "../services/dashboardService";
import { getProjectById } from "../services/projectService";
import sprintService from "../services/sprintService";
import { toast } from "react-toastify";

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
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 text-sm font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-12 mb-8 shadow-lg flex justify-between items-center gap-6">
        <div className="text-white">
          <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 rounded-full px-4 py-2 mb-4">
            <span className="material-symbols-outlined text-lg">bolt</span>
            <span className="text-sm font-medium">Productivity Hub</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Welcome back, {user.fullname}!</h1>
          <p className="text-purple-100">Here's your productivity overview and recent activities</p>
        </div>
        <div className="flex items-center gap-2 text-white text-lg font-medium">
          <span className="material-symbols-outlined">calendar_today</span>
          <span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              <span className="material-symbols-outlined">assignment</span>
            </div>
            <div className="flex-1">
              <div className="text-gray-600 text-sm font-medium">Total Tasks</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">{overview?.total ?? 0}</div>
              <div className="text-xs text-gray-500 mt-2">All tasks assigned to you</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div className="flex-1">
              <div className="text-gray-600 text-sm font-medium">Completed</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">{overview?.done ?? 0}</div>
              <div className="text-xs text-gray-500 mt-2">Tasks successfully finished</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600">
              <span className="material-symbols-outlined">schedule</span>
            </div>
            <div className="flex-1">
              <div className="text-gray-600 text-sm font-medium">Upcoming</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">{overview?.upcomingTasks?.length ?? 0}</div>
              <div className="text-xs text-gray-500 mt-2">Tasks with approaching deadlines</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <div className="flex-1">
              <div className="text-gray-600 text-sm font-medium">Overdue</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">{overview?.overdue ?? 0}</div>
              <div className="text-xs text-gray-500 mt-2">Tasks past their deadline</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span className="material-symbols-outlined">event</span>
              Upcoming Deadlines
            </h3>
            <span className="bg-purple-100 text-purple-600 text-xs font-bold px-3 py-1 rounded-full">{overview?.upcomingTasks?.length ?? 0}</span>
          </div>
          <div className="divide-y divide-gray-200">
            {!overview?.upcomingTasks || overview.upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <span className="material-symbols-outlined text-4xl mb-2">task_alt</span>
                <p className="text-sm font-medium">No upcoming tasks</p>
              </div>
            ) : (
              overview.upcomingTasks.map((task) => (
                <div
                  key={task._id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => task.key && navigate(`/app/task/${task.key}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{task.name}</div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {task.projectId?.name || "Unknown Project"}
                        </span>
                        {task.statusId?.name && (
                          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">{task.statusId.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                      <span className="material-symbols-outlined text-sm">event</span>
                      <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline"}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span className="material-symbols-outlined">trending_up</span>
              Project Progress
            </h3>
            <span className="bg-purple-100 text-purple-600 text-xs font-bold px-3 py-1 rounded-full">{overview?.projectProgress?.length ?? 0}</span>
          </div>
          <div className="divide-y divide-gray-200">
            {!overview?.projectProgress || overview.projectProgress.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <span className="material-symbols-outlined text-4xl mb-2">folder_off</span>
                <p className="text-sm font-medium">No active projects</p>
              </div>
            ) : (
              overview.projectProgress.map((proj) => (
                <div key={proj.projectKey} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{proj.project}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                        <span className="font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">{proj.role}</span>
                        {proj.endDate && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <span className="material-symbols-outlined text-sm">event</span>
                            {new Date(proj.endDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-purple-600">{proj.progress}%</div>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-500 transition-all duration-300"
                      style={{ width: `${proj.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="material-symbols-outlined">notifications_active</span>
            Recent Activity
          </h3>
          <span className="bg-purple-100 text-purple-600 text-xs font-bold px-3 py-1 rounded-full">{overview?.recentActivity?.length ?? 0}</span>
        </div>
        <div className="divide-y divide-gray-200">
          {!overview?.recentActivity || overview.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2">history</span>
              <p className="text-sm font-medium">No recent activity</p>
            </div>
          ) : (
            overview.recentActivity.map((log, idx) => (
              <div key={log._id || idx} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                    {log.user.avatar ? (
                      <img src={log.user.avatar} alt={log.user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{log.user.name?.[0] || "?"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{log.user.name}</span>
                      <span className="text-gray-600 text-sm">{log.action}</span>
                      {log.entityUrl ? (
                        <button
                          onClick={(e) => handleEntityClick(log, e)}
                          className="text-purple-600 font-semibold hover:text-purple-700 transition-colors"
                        >
                          {log.entityKey}
                        </button>
                      ) : log.entityKey ? (
                        <span className="text-purple-600 font-semibold">{log.entityKey}</span>
                      ) : null}
                      {log.entityName && <span className="text-gray-600 text-sm">{log.entityName}</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</div>
                  </div>
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
