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
    <div className="performance-panel-overlay" onClick={onClose}>
      <div className="performance-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="performance-header">
          <div className="performance-header-left">
            <div className="user-avatar-large">
              {userAvatar ? <img src={userAvatar} alt={userName} /> : <div className="avatar-placeholder-large">{userName?.[0] || "?"}</div>}
            </div>
            <div className="user-info-header">
              <h2>{userName}</h2>
              <p className="performance-subtitle">Performance Analysis</p>
            </div>
          </div>
          <button className="close-btn-performance" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="performance-date-filter">
          <div className="date-filter-group">
            <label htmlFor="startDate">From:</label>
            <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="date-input" />
          </div>
          <div className="date-filter-group">
            <label htmlFor="endDate">To:</label>
            <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="date-input" />
          </div>
          {(startDate || endDate) && (
            <button
              className="clear-filter-btn"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
            >
              <span className="material-symbols-outlined">clear</span>
              Clear
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="performance-tabs">
          <button className={`performance-tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
            <span className="material-symbols-outlined">analytics</span>
            Overview
          </button>
          <button className={`performance-tab ${activeTab === "tasks" ? "active" : ""}`} onClick={() => setActiveTab("tasks")}>
            <span className="material-symbols-outlined">task_alt</span>
            Tasks ({tasks.length})
          </button>
        </div>

        {/* Content */}
        <div className="performance-content">
          {activeTab === "overview" && (
            <div className="overview-tab">
              {/* Overall Efficiency Card */}
              <div className="spi-card-large">
                <div className="spi-label">Overall Efficiency</div>
                <div className="spi-value-large" style={{ color: getEfficiencyColor(summary.overallEfficiency) }}>
                  {summary.overallEfficiency !== null ? `${summary.overallEfficiency.toFixed(0)}%` : "N/A"}
                </div>
                <div className="spi-rating" style={{ backgroundColor: getRatingColor(summary.performanceRating) }}>
                  {summary.performanceRating}
                </div>
                <div className="spi-formula">
                  <p>
                    Efficiency = (<span className="formula-highlight">Total Est</span> / <span className="formula-highlight">Total Act</span>) × 100%
                  </p>
                  <p className="formula-detail">
                    Efficiency = ({summary.totalEstimatedTime}h) / ({summary.totalActualTime}h) × 100% ={" "}
                    {summary.overallEfficiency !== null ? `${summary.overallEfficiency.toFixed(0)}%` : "N/A"}
                  </p>
                  <p className="formula-note" style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>
                    * Chỉ tính cho các task đã hoàn thành (Done)
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="performance-stats-grid">
                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: "#e0e7ff" }}>
                    <span className="material-symbols-outlined" style={{ color: "#6366f1" }}>
                      schedule
                    </span>
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Estimated Time</div>
                    <div className="stat-value">{formatHours(summary.totalEstimatedTime)}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: "#fef3c7" }}>
                    <span className="material-symbols-outlined" style={{ color: "#f59e0b" }}>
                      timelapse
                    </span>
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Actual Time</div>
                    <div className="stat-value">{formatHours(summary.totalActualTime)}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: "#dbeafe" }}>
                    <span className="material-symbols-outlined" style={{ color: "#3b82f6" }}>
                      speed
                    </span>
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Efficiency</div>
                    <div className="stat-value">{summary.efficiency}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: "#d1fae5" }}>
                    <span className="material-symbols-outlined" style={{ color: "#10b981" }}>
                      check_circle_outline
                    </span>
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">On-Time Completion</div>
                    <div className="stat-value">{summary.onTimePercentage !== null ? `${summary.onTimePercentage.toFixed(0)}%` : "N/A"}</div>
                    <div className="stat-detail" style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
                      {summary.onTimeCount || 0} / {summary.tasksWithDueDate || 0} tasks
                    </div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: "#e0f2fe" }}>
                    <span className="material-symbols-outlined" style={{ color: "#0284c7" }}>
                      check_circle
                    </span>
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Completed Tasks</div>
                    <div className="stat-value">{summary.completedTasks}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: "#fce7f3" }}>
                    <span className="material-symbols-outlined" style={{ color: "#ec4899" }}>
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
                          <div className="progress-bar-mini">
                            <div className="progress-fill-mini" style={{ width: "100%" }}></div>
                          </div>
                          <span>100%</span>
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
