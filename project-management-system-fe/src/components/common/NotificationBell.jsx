import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import socketService from "../../services/socketService";
import notificationService from "../../services/notificationService";
import { getProjectById } from "../../services/projectService";
import sprintService from "../../services/sprintService";
import { toast } from "react-toastify";
import { ProjectContext } from "../../contexts/ProjectContext";
import "./NotificationBell.css";

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const { setProject } = useContext(ProjectContext);

  // Fetch initial notifications
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  // Setup socket listeners
  useEffect(() => {
    const handleNewNotification = (notification) => {
      console.log("📩 New notification received:", notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast with full information
      const toastOptions = {
        position: "bottom-right",
        autoClose: 8000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      };

      // Format message with full details
      const fullMessage = `${notification.message}`;

      // Use different toast types based on priority
      if (notification.priority === "CRITICAL") {
        toast.error(
          <div>
            <strong style={{ fontSize: "14px" }}>{notification.title}</strong>
            <div style={{ fontSize: "13px", marginTop: "6px", lineHeight: "1.4" }}>{fullMessage}</div>
          </div>,
          toastOptions
        );
      } else if (notification.priority === "HIGH") {
        toast.warning(
          <div>
            <strong style={{ fontSize: "14px" }}>{notification.title}</strong>
            <div style={{ fontSize: "13px", marginTop: "6px", lineHeight: "1.4" }}>{fullMessage}</div>
          </div>,
          toastOptions
        );
      } else if (notification.priority === "MEDIUM") {
        toast.info(
          <div>
            <strong style={{ fontSize: "14px" }}>{notification.title}</strong>
            <div style={{ fontSize: "13px", marginTop: "6px", lineHeight: "1.4" }}>{fullMessage}</div>
          </div>,
          toastOptions
        );
      } else {
        // LOW priority - use success type
        toast.success(
          <div>
            <strong style={{ fontSize: "14px" }}>{notification.title}</strong>
            <div style={{ fontSize: "13px", marginTop: "6px", lineHeight: "1.4" }}>{fullMessage}</div>
          </div>,
          toastOptions
        );
      }
    };

    const handleUnreadCount = (count) => {
      console.log("📊 Unread count updated:", count);
      setUnreadCount(count);
    };

    socketService.on("notification", handleNewNotification);
    socketService.on("notification:unreadCount", handleUnreadCount);

    return () => {
      socketService.off("notification");
      socketService.off("notification:unreadCount");
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!listRef.current || loading || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        loadMoreNotifications();
      }
    };

    const listElement = listRef.current;
    if (listElement) {
      listElement.addEventListener("scroll", handleScroll);
      return () => listElement.removeEventListener("scroll", handleScroll);
    }
  }, [loading, hasMore, page]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(1, 10);
      setNotifications(data.notifications || []);
      setHasMore(data.hasMore || false);
      setPage(1);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const loadMoreNotifications = async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      const nextPage = page + 1;
      const data = await notificationService.getNotifications(nextPage, 10);
      setNotifications((prev) => [...prev, ...(data.notifications || [])]);
      setHasMore(data.hasMore || false);
      setPage(nextPage);
    } catch (error) {
      console.error("Error loading more notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      socketService.markAsRead(notificationId);

      setNotifications((prev) => prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      socketService.markAllAsRead();

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    // Navigate based on notification type and relatedType
    if (notification.relatedType === "Task" && notification.relatedId) {
      navigate(`/task/${notification.relatedId}`);
    } else if (notification.relatedType === "Project") {
      // Project notifications: fetch project to get key from ID
      try {
        const response = await getProjectById(notification.relatedId);
        const project = response.data;
        const projectKey = project?.key;
        if (projectKey) {
          // Set project data to context before navigating
          setProject(project);
          navigate(`/task-mgmt/projects/${projectKey}/settings/general`);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        toast.error("Could not navigate to project");
      }
    } else if (notification.relatedType === "Sprint") {
      // Sprint notifications: fetch sprint to get project key from project ID
      try {
        const sprint = await sprintService.getSprintById(notification.relatedId);
        const projectId = sprint.projectId?._id || sprint.projectId;

        // Fetch full project data to set context
        const response = await getProjectById(projectId);
        const project = response.data;
        const projectKey = project?.key;

        if (projectKey) {
          // Set project data to context before navigating
          setProject(project);
          navigate(`/task-mgmt/projects/${projectKey}/backlog`);
        }
      } catch (error) {
        console.error("Error fetching sprint:", error);
        toast.error("Could not navigate to sprint");
      }
    } else if (notification.relatedType === "Group" && notification.relatedId) {
      // Group notifications: relatedId is the group ID
      navigate(`/organization/group/${notification.relatedId}`);
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      task_assigned: "assignment",
      task_commented: "comment",
      task_status_changed: "sync_alt",
      task_priority_changed: "priority_high",
      task_deadline_soon: "schedule",
      task_overdue: "error",
      project_member_added: "person_add",
      project_member_removed: "person_remove",
      sprint_started: "play_arrow",
      sprint_ending_soon: "schedule",
      sprint_completed: "check_circle",
      group_member_added: "group_add",
      group_member_removed: "group_remove",
    };
    return icons[type] || "notifications";
  };

  const getPriorityClass = (priority) => {
    return `priority-${priority?.toLowerCase() || "low"}`;
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button className="notification-bell-button" onClick={() => setIsOpen(!isOpen)}>
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read-btn" onClick={handleMarkAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list" ref={listRef}>
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span className="material-symbols-outlined">notifications_off</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              <>
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`notification-item ${!notification.isRead ? "unread" : ""} ${getPriorityClass(notification.priority)}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-icon">
                      <span className="material-symbols-outlined">{getNotificationIcon(notification.type)}</span>
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">{getTimeAgo(notification.createdAt)}</div>
                    </div>
                    {!notification.isRead && <div className="notification-unread-dot"></div>}
                  </div>
                ))}

                {loading && (
                  <div className="notification-loading">
                    <div className="spinner"></div>
                    <p>Loading more...</p>
                  </div>
                )}

                {!loading && hasMore && (
                  <div className="notification-load-more">
                    <button className="load-more-btn" onClick={loadMoreNotifications}>
                      <span className="material-symbols-outlined">expand_more</span>
                      Load More Notifications
                    </button>
                  </div>
                )}

                {!loading && !hasMore && notifications.length > 0 && (
                  <div className="notification-end">
                    <span className="material-symbols-outlined">check_circle</span>
                    <p>You've reached the end</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
