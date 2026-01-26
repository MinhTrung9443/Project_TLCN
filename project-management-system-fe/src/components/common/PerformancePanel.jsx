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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 text-slate-700">
            <span className="material-symbols-outlined animate-spin text-sky-600">progress_activity</span>
            Loading performance data...
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 to-slate-50 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-sky-200 flex items-center justify-center bg-sky-100 text-sky-700 font-semibold text-lg">
              {userAvatar ? <img src={userAvatar} alt={userName} className="h-full w-full object-cover" /> : <span>{userName?.[0] || "?"}</span>}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{userName}</h2>
              <p className="text-sm text-slate-500">Performance Analysis</p>
            </div>
          </div>
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3">
          <label className="text-sm text-slate-600 flex flex-col gap-1">
            From:
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <label className="text-sm text-slate-600 flex flex-col gap-1">
            To:
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </label>
          {(startDate || endDate) && (
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white transition-colors"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Clear
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === "overview" ? "border-b-2 border-sky-600 text-sky-600" : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("overview")}
          >
            <span className="material-symbols-outlined text-lg">analytics</span>
            Overview
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === "tasks" ? "border-b-2 border-sky-600 text-sky-600" : "text-slate-600 hover:text-slate-900"
            }`}
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
              <div className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-6 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Overall Efficiency</div>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <div className="text-5xl font-bold" style={{ color: getEfficiencyColor(summary.overallEfficiency) }}>
                      {summary.overallEfficiency !== null ? `${summary.overallEfficiency.toFixed(0)}%` : "N/A"}
                    </div>
                    <div
                      className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: getRatingColor(summary.performanceRating) }}
                    >
                      {summary.performanceRating}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <p>
                    Efficiency = <span className="font-semibold text-sky-700">Total Est</span> /{" "}
                    <span className="font-semibold text-sky-700">Total Act</span> × 100%
                  </p>
                  <p className="text-slate-600">
                    = ({summary.totalEstimatedTime}h) / ({summary.totalActualTime}h) × 100% ={" "}
                    {summary.overallEfficiency !== null ? `${summary.overallEfficiency.toFixed(0)}%` : "N/A"}
                  </p>
                  <p className="text-xs text-slate-500 italic">* Only calculated for completed tasks (Done)</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    label: "Estimated Time",
                    value: formatHours(summary.totalEstimatedTime),
                    icon: "schedule",
                    color: "text-indigo-600",
                    bg: "bg-indigo-50",
                  },
                  {
                    label: "Actual Time",
                    value: formatHours(summary.totalActualTime),
                    icon: "timelapse",
                    color: "text-amber-600",
                    bg: "bg-amber-50",
                  },
                  {
                    label: "On-Time Completion",
                    value: summary.onTimePercentage !== null ? `${summary.onTimePercentage.toFixed(0)}%` : "N/A",
                    icon: "check_circle_outline",
                    color: "text-emerald-600",
                    bg: "bg-emerald-50",
                    sub: `${summary.onTimeCount || 0} / ${summary.tasksWithDueDate || 0} tasks`,
                  },
                  { label: "Completed Tasks", value: summary.completedTasks, icon: "check_circle", color: "text-cyan-600", bg: "bg-cyan-50" },
                  { label: "In Progress", value: summary.inProgressTasks, icon: "pending", color: "text-rose-600", bg: "bg-rose-50" },
                  { label: "To Do", value: summary.todoTasks || 0, icon: "inbox", color: "text-slate-600", bg: "bg-slate-100" },
                ].map((stat, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color}`}>
                        <span className="material-symbols-outlined text-xl">{stat.icon}</span>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{stat.label}</p>
                        <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                        {stat.sub && <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Performance Guide */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span className="material-symbols-outlined text-sky-600">info</span>
                  Understanding Efficiency
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <span className="font-semibold text-emerald-600 min-w-fit">Efficiency ≥ 100%:</span>
                    <span>Excellent - Completed faster than estimated</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-sky-600 min-w-fit">Efficiency ≥ 80%:</span>
                    <span>Good - Close to estimated time</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-amber-600 min-w-fit">Efficiency ≥ 60%:</span>
                    <span>Average - Slightly over estimated time</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-rose-600 min-w-fit">Efficiency &lt; 60%:</span>
                    <span>Needs Improvement - Significantly over estimated time</span>
                  </li>
                </ul>
                <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
                  <p className="font-semibold text-sky-900">On-Time Completion</p>
                  <p className="text-slate-600 mt-1">Percentage of completed tasks finished before or on their due date</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-slate-600">
                  <div className="flex justify-center mb-2">
                    <span className="material-symbols-outlined text-4xl text-slate-400">inbox</span>
                  </div>
                  <p className="font-medium">No completed tasks found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-sky-600">{task.key}</span>
                            <span className="font-semibold text-slate-900">{task.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {task.isOnTime !== null && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white"
                              style={{ backgroundColor: task.isOnTime ? "#10b981" : "#ef4444" }}
                            >
                              <span className="material-symbols-outlined text-base">{task.isOnTime ? "check_circle" : "schedule"}</span>
                              {task.isOnTime ? "On Time" : "Late"}
                            </span>
                          )}
                          {task.efficiency !== null && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white"
                              style={{ backgroundColor: getEfficiencyColor(task.efficiency) }}
                            >
                              {task.efficiency.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base text-sky-600">schedule</span>
                          <div>
                            <p className="text-xs text-slate-500">Est</p>
                            <p className="font-semibold">{formatHours(task.estimatedTime)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base text-amber-600">timelapse</span>
                          <div>
                            <p className="text-xs text-slate-500">Act</p>
                            <p className="font-semibold">{formatHours(task.actualTime)}</p>
                          </div>
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-slate-600">event</span>
                            <div>
                              <p className="text-xs text-slate-500">Due</p>
                              <p className="font-semibold">{new Date(task.dueDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-slate-500">Complete</p>
                          <p className="font-semibold text-emerald-600">100%</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full w-full bg-emerald-500 rounded-full"></div>
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
