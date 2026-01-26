import React, { useState, useEffect } from "react";
import performanceService from "../../services/performanceService";
import { toast } from "react-toastify";

const PerformancePanel = ({ userId, userName, userAvatar, projectId, defaultStartDate, defaultEndDate, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview, tasks, timelogs

  // Date range state - initialize with default values immediately
  const [startDate, setStartDate] = useState(defaultStartDate || "");
  const [endDate, setEndDate] = useState(defaultEndDate || "");

  useEffect(() => {
    // Validate userId và projectId trước khi fetch
    if (!userId || !projectId || userId === "undefined" || projectId === "undefined") {
      console.error("Invalid userId or projectId:", { userId, projectId });
      toast.error("Invalid user or project data");
      setLoading(false);
      return;
    }
    fetchPerformanceData();
  }, [userId, projectId, startDate, endDate]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await performanceService.getUserPerformance(userId, projectId, params);
      setPerformance(response.data);
    } catch (error) {
      console.error("Error fetching performance data:", error);
      toast.error(error.response?.data?.message || "Failed to load performance data");
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case "Excellent":
        return "#10b981";
      case "Good":
        return "#3b82f6";
      case "Average":
        return "#f59e0b";
      case "Needs Improvement":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency === null || efficiency === undefined) return "#6b7280";
    if (efficiency >= 100) return "#10b981";
    if (efficiency >= 80) return "#3b82f6";
    if (efficiency >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const formatHours = (hours) => {
    if (!hours) return "0h";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (loading) {
    return (
      <div className="performance-panel-overlay" onClick={onClose}>
        <div className="performance-panel" onClick={(e) => e.stopPropagation()}>
          <div className="performance-loading">
            <div className="spinner-large"></div>
            <p>Loading performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!performance) {
    return null;
  }

  const { summary, tasks } = performance;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <div className="text-white text-2xl font-bold">{userName?.[0] || "?"}</div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">{userName}</h2>
              <p className="text-sm text-neutral-600">Performance Analysis</p>
            </div>
          </div>
          <button className="p-2 hover:bg-neutral-100 rounded-lg transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined text-neutral-600">close</span>
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-4 p-4 bg-neutral-50 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <label htmlFor="startDate" className="text-sm font-medium text-neutral-700">
              From:
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="endDate" className="text-sm font-medium text-neutral-700">
              To:
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>
          {(startDate || endDate) && (
            <button
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
            >
              <span className="material-symbols-outlined text-lg">clear</span>
              Clear
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200">
          <button
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === "overview" ? "text-primary-600 border-b-2 border-primary-600" : "text-neutral-600 hover:text-neutral-900"}`}
            onClick={() => setActiveTab("overview")}
          >
            <span className="material-symbols-outlined text-lg">analytics</span>
            Overview
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === "tasks" ? "text-primary-600 border-b-2 border-primary-600" : "text-neutral-600 hover:text-neutral-900"}`}
            onClick={() => setActiveTab("tasks")}
          >
            <span className="material-symbols-outlined text-lg">task_alt</span>
            Tasks ({tasks.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Overall Efficiency Card */}
              <div className="p-6 bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl border border-primary-200">
                <div className="text-sm font-medium text-neutral-600 mb-2">Overall Efficiency</div>
                <div className="text-5xl font-bold mb-3" style={{ color: getEfficiencyColor(summary.overallEfficiency) }}>
                  {summary.overallEfficiency !== null ? `${summary.overallEfficiency.toFixed(0)}%` : "N/A"}
                </div>
                <div
                  className="inline-block px-4 py-1 rounded-full text-white text-sm font-semibold mb-4"
                  style={{ backgroundColor: getRatingColor(summary.performanceRating) }}
                >
                  {summary.performanceRating}
                </div>
                <div className="space-y-2 text-sm text-neutral-700">
                  <p>
                    Efficiency = (<span className="font-semibold text-primary-700">Total Est</span> /{" "}
                    <span className="font-semibold text-primary-700">Total Act</span>) × 100%
                  </p>
                  <p className="text-neutral-600">
                    Efficiency = ({summary.totalEstimatedTime}h) / ({summary.totalActualTime}h) × 100% ={" "}
                    {summary.overallEfficiency !== null ? `${summary.overallEfficiency.toFixed(0)}%` : "N/A"}
                  </p>
                  <p className="text-xs text-neutral-500 mt-2">* Chỉ tính cho các task đã hoàn thành (Done)</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#e0e7ff" }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: "#6366f1" }}>
                      schedule
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-neutral-600">Estimated Time</div>
                    <div className="text-2xl font-bold text-neutral-900">{formatHours(summary.totalEstimatedTime)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fef3c7" }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: "#f59e0b" }}>
                      timelapse
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-neutral-600">Actual Time</div>
                    <div className="text-2xl font-bold text-neutral-900">{formatHours(summary.totalActualTime)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#dbeafe" }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: "#3b82f6" }}>
                      speed
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-neutral-600">Efficiency</div>
                    <div className="text-2xl font-bold text-neutral-900">{summary.efficiency}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#d1fae5" }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: "#10b981" }}>
                      check_circle_outline
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-neutral-600">On-Time Completion</div>
                    <div className="text-2xl font-bold text-neutral-900">
                      {summary.onTimePercentage !== null ? `${summary.onTimePercentage.toFixed(0)}%` : "N/A"}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {summary.onTimeCount || 0} / {summary.tasksWithDueDate || 0} tasks
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#e0f2fe" }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: "#0284c7" }}>
                      check_circle
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-neutral-600">Completed Tasks</div>
                    <div className="text-2xl font-bold text-neutral-900">{summary.completedTasks}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fce7f3" }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: "#ec4899" }}>
                      pending
                    </span>
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">In Progress</div>
                    <div className="stat-value">{summary.inProgressTasks}</div>
                  </div>
                </div>
              </div>

              {/* Performance Interpretation */}
              <div className="performance-info-box">
                <h4>
                  <span className="material-symbols-outlined">info</span>
                  Understanding Efficiency
                </h4>
                <ul>
                  <li>
                    <strong>Efficiency ≥ 100%:</strong> Excellent - Completed faster than estimated
                  </li>
                  <li>
                    <strong>Efficiency ≥ 80%:</strong> Good - Close to estimated time
                  </li>
                  <li>
                    <strong>Efficiency ≥ 60%:</strong> Average - Slightly over estimated time
                  </li>
                  <li>
                    <strong>Efficiency &lt; 60%:</strong> Needs Improvement - Significantly over estimated time
                  </li>
                </ul>
                <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#f0f9ff", borderRadius: "6px" }}>
                  <strong style={{ color: "#0284c7" }}>On-Time Completion:</strong>
                  <p style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>
                    Percentage of completed tasks finished before or on their due date
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="tasks-tab">
              {tasks.length === 0 ? (
                <div className="empty-state">
                  <span className="material-symbols-outlined">inbox</span>
                  <p>No completed tasks found</p>
                </div>
              ) : (
                <div className="tasks-list">
                  {tasks.map((task) => (
                    <div key={task._id} className="task-performance-item">
                      <div className="task-performance-header">
                        <div className="task-info">
                          <span className="task-key">{task.key}</span>
                          <span className="task-name">{task.name}</span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {task.isOnTime !== null && (
                            <div
                              className="task-spi-badge"
                              style={{ backgroundColor: task.isOnTime ? "#10b981" : "#ef4444" }}
                              title={task.isOnTime ? "Completed on time" : "Completed late"}
                            >
                              {task.isOnTime ? "On Time" : "Late"}
                            </div>
                          )}
                          {task.efficiency !== null && (
                            <div className="task-spi-badge" style={{ backgroundColor: getEfficiencyColor(task.efficiency) }}>
                              {task.efficiency.toFixed(0)}%
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="task-performance-details">
                        <div className="task-detail-item">
                          <span className="material-symbols-outlined">schedule</span>
                          <span>Est: {formatHours(task.estimatedTime)}</span>
                        </div>
                        <div className="task-detail-item">
                          <span className="material-symbols-outlined">timelapse</span>
                          <span>Act: {formatHours(task.actualTime)}</span>
                        </div>
                        {task.dueDate && (
                          <div className="task-detail-item">
                            <span className="material-symbols-outlined">event</span>
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="task-detail-item">
                          <div className="flex-1 h-1 bg-neutral-200 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-600 rounded-full" style={{ width: "100%" }}></div>
                          </div>
                          <span className="text-xs font-semibold text-neutral-600">100%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformancePanel;
