import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import socketService from "../../services/socketService";
import notificationService from "../../services/notificationService";
import { getProjectById } from "../../services/projectService";
import sprintService from "../../services/sprintService";
import { toast } from "react-toastify";
import { ProjectContext } from "../../contexts/ProjectContext";

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
          toastOptions,
        );
      } else if (notification.priority === "HIGH") {
        toast.warning(
          <div>
            <strong style={{ fontSize: "14px" }}>{notification.title}</strong>
            <div style={{ fontSize: "13px", marginTop: "6px", lineHeight: "1.4" }}>{fullMessage}</div>
          </div>,
          toastOptions,
        );
      } else if (notification.priority === "MEDIUM") {
        toast.info(
          <div>
            <strong style={{ fontSize: "14px" }}>{notification.title}</strong>
            <div style={{ fontSize: "13px", marginTop: "6px", lineHeight: "1.4" }}>{fullMessage}</div>
          </div>,
          toastOptions,
        );
      } else {
        // LOW priority - use success type
        toast.success(
          <div>
            <strong style={{ fontSize: "14px" }}>{notification.title}</strong>
            <div style={{ fontSize: "13px", marginTop: "6px", lineHeight: "1.4" }}>{fullMessage}</div>
          </div>,
          toastOptions,
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
      navigate(`/app/task/${notification.relatedId}`);
    } else if (notification.relatedType === "Project") {
      // Project notifications: fetch project to get key from ID
      try {
        const response = await getProjectById(notification.relatedId);
        const project = response.data;
        const projectKey = project?.key;
        if (projectKey) {
          // Set project data to context before navigating
          setProject(project);
          navigate(`/app/task-mgmt/projects/${projectKey}/settings/general`);
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
          navigate(`/app/task-mgmt/projects/${projectKey}/backlog`);
        }
      } catch (error) {
        console.error("Error fetching sprint:", error);
        toast.error("Could not navigate to sprint");
      }
    } else if (notification.relatedType === "Group" && notification.relatedId) {
      // Group notifications: relatedId is the group ID
      navigate(`/app/organization/group/${notification.relatedId}`);
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
    const classes = {
      critical: "border-l-4 border-red-500",
      high: "border-l-4 border-orange-500",
      medium: "border-l-4 border-blue-500",
      low: "border-l-4 border-gray-400",
    };
    return classes[priority?.toLowerCase()] || classes.low;
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
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="material-symbols-outlined text-gray-700">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium" onClick={handleMarkAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1" ref={listRef}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <span className="material-symbols-outlined text-4xl mb-2">notifications_off</span>
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <>
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.isRead ? "bg-purple-50" : ""
                    } ${getPriorityClass(notification.priority)}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                      <span className="material-symbols-outlined text-xl">{getNotificationIcon(notification.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{notification.title}</div>
                      <div className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</div>
                      <div className="text-xs text-gray-500 mt-1">{getTimeAgo(notification.createdAt)}</div>
                    </div>
                    {!notification.isRead && <div className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0 mt-2"></div>}
                  </div>
                ))}

                {loading && (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="w-8 h-8 border-3 border-neutral-200 border-t-primary-600 rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-600 mt-2">Loading more...</p>
                  </div>
                )}

                {!loading && hasMore && (
                  <div className="p-4">
                    <button
                      className="w-full flex items-center justify-center gap-2 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium"
                      onClick={loadMoreNotifications}
                    >
                      <span className="material-symbols-outlined">expand_more</span>
                      Load More Notifications
                    </button>
                  </div>
                )}

                {!loading && !hasMore && notifications.length > 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                    <span className="material-symbols-outlined text-2xl mb-1">check_circle</span>
                    <p className="text-sm">You've reached the end</p>
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
