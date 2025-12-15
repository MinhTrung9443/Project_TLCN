import React, { useState, useEffect } from "react";
import performanceService from "../../services/performanceService";
import { toast } from "react-toastify";
import "../../styles/components/PerformancePanel.css";

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

  const getSPIColor = (spi) => {
    if (spi === null || spi === undefined) return "#6b7280";
    if (spi >= 1.2) return "#10b981";
    if (spi >= 1.0) return "#3b82f6";
    if (spi >= 0.8) return "#f59e0b";
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
              {/* Overall SPI Card */}
              <div className="spi-card-large">
                <div className="spi-label">Overall SPI (Schedule Performance Index)</div>
                <div className="spi-value-large" style={{ color: getSPIColor(summary.overallSPI) }}>
                  {summary.overallSPI !== null ? summary.overallSPI.toFixed(2) : "N/A"}
                </div>
                <div className="spi-rating" style={{ backgroundColor: getRatingColor(summary.performanceRating) }}>
                  {summary.performanceRating}
                </div>
                <div className="spi-formula">
                  <p>
                    SPI = <span className="formula-highlight">Earned Value</span> / <span className="formula-highlight">Actual Time</span>
                  </p>
                  <p className="formula-detail">
                    SPI = ({summary.totalEarnedValue}h) / ({summary.totalActualTime}h) ={" "}
                    {summary.overallSPI !== null ? summary.overallSPI.toFixed(2) : "N/A"}
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
                  <div className="stat-icon" style={{ backgroundColor: "#d1fae5" }}>
                    <span className="material-symbols-outlined" style={{ color: "#10b981" }}>
                      trending_up
                    </span>
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Earned Value</div>
                    <div className="stat-value">{formatHours(summary.totalEarnedValue)}</div>
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
                  Understanding SPI
                </h4>
                <ul>
                  <li>
                    <strong>SPI &gt; 1.0:</strong> Ahead of schedule - working faster than estimated
                  </li>
                  <li>
                    <strong>SPI = 1.0:</strong> On schedule - working at estimated pace
                  </li>
                  <li>
                    <strong>SPI &lt; 1.0:</strong> Behind schedule - taking longer than estimated
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="tasks-tab">
              {tasks.length === 0 ? (
                <div className="empty-state">
                  <span className="material-symbols-outlined">inbox</span>
                  <p>No tasks with logged time found</p>
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
                        {task.spi !== null && (
                          <div className="task-spi-badge" style={{ backgroundColor: getSPIColor(task.spi) }}>
                            SPI: {task.spi.toFixed(2)}
                          </div>
                        )}
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
                        <div className="task-detail-item">
                          <span className="material-symbols-outlined">trending_up</span>
                          <span>EV: {formatHours(task.earnedValue)}</span>
                        </div>
                        <div className="task-detail-item">
                          <div className="progress-bar-mini">
                            <div className="progress-fill-mini" style={{ width: `${task.progress}%` }}></div>
                          </div>
                          <span>{task.progress}%</span>
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
