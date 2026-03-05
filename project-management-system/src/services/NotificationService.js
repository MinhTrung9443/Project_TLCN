const Notification = require("../models/Notification");
const Task = require("../models/Task");

class NotificationService {
  constructor() {
    this.io = null;
  }

  // Initialize socket.io instance
  setIO(io) {
    this.io = io;
  }

  // ============================================
  // NOTIFICATION TYPES & PRIORITIES
  // ============================================

  static TYPES = {
    // Task notifications
    TASK_ASSIGNED: "task_assigned",
    TASK_UPDATED: "task_updated",
    TASK_DELETED: "task_deleted",
    TASK_COMMENTED: "task_commented",
    TASK_STATUS_CHANGED: "task_status_changed",
    TASK_PRIORITY_CHANGED: "task_priority_changed",
    TASK_DEADLINE_SOON: "task_deadline_soon",
    TASK_OVERDUE: "task_overdue",

    // Project notifications
    PROJECT_MEMBER_ADDED: "project_member_added",
    PROJECT_MEMBER_REMOVED: "project_member_removed",
    PROJECT_ROLE_CHANGED: "project_role_changed",

    // Sprint notifications
    SPRINT_STARTED: "sprint_started",
    SPRINT_ENDING_SOON: "sprint_ending_soon",
    SPRINT_COMPLETED: "sprint_completed",

    // Group notifications
    GROUP_MEMBER_ADDED: "group_member_added",
    GROUP_MEMBER_REMOVED: "group_member_removed",

    // Meeting notifications
    MEETING_INVITED: "meeting_invited",

    // System notifications
    WORKFLOW_CHANGED: "workflow_changed",
  };

  static PRIORITIES = {
    CRITICAL: ["task_overdue", "task_deadline_soon", "task_deleted"],
    HIGH: ["task_assigned", "task_priority_changed"],
    MEDIUM: ["task_status_changed", "task_commented", "sprint_ending_soon", "task_deadline_changed", "task_updated", "meeting_invited"],
    LOW: ["project_member_added", "group_member_added", "sprint_started", "sprint_completed"],
  };

  // Get priority level for notification type
  getPriority(type) {
    for (const [priority, types] of Object.entries(NotificationService.PRIORITIES)) {
      if (types.includes(type)) {
        return priority;
      }
    }
    return "LOW";
  }

  // ============================================
  // CREATE & SEND NOTIFICATION
  // ============================================

  buildGroupMessage(type, metadata, latestActorName, actorCount, fallbackMessage) {
    if (type === NotificationService.TYPES.TASK_COMMENTED && metadata?.taskName) {
      if (actorCount <= 1) {
        return fallbackMessage;
      }
      return `${latestActorName} and ${actorCount - 1} other${actorCount - 1 > 1 ? "s" : ""} commented on "${metadata.taskName}"`;
    }

    if (type === NotificationService.TYPES.TASK_UPDATED && metadata?.taskName) {
      if (actorCount <= 1) {
        return fallbackMessage;
      }
      return `${latestActorName} and ${actorCount - 1} other${actorCount - 1 > 1 ? "s" : ""} updated "${metadata.taskName}"`;
    }

    if (type === NotificationService.TYPES.TASK_STATUS_CHANGED && metadata?.taskName) {
      if (actorCount <= 1) {
        return fallbackMessage;
      }
      return `${latestActorName} and ${actorCount - 1} other${actorCount - 1 > 1 ? "s" : ""} changed status of "${metadata.taskName}"`;
    }

    if (type === NotificationService.TYPES.TASK_PRIORITY_CHANGED && metadata?.taskName) {
      if (actorCount <= 1) {
        return fallbackMessage;
      }
      return `${latestActorName} and ${actorCount - 1} other${actorCount - 1 > 1 ? "s" : ""} changed priority of "${metadata.taskName}"`;
    }

    return fallbackMessage;
  }

  buildGroupTitle(type, actorCount, fallbackTitle) {
    if (type === NotificationService.TYPES.TASK_COMMENTED && actorCount > 1) {
      return "New Comments on Task";
    }
    if (type === NotificationService.TYPES.TASK_UPDATED && actorCount > 1) {
      return "Task Updated by Multiple People";
    }
    if (type === NotificationService.TYPES.TASK_STATUS_CHANGED && actorCount > 1) {
      return "Task Status Updated";
    }
    if (type === NotificationService.TYPES.TASK_PRIORITY_CHANGED && actorCount > 1) {
      return "Task Priority Updated";
    }
    return fallbackTitle;
  }

  async createAndSend({
    userId,
    title,
    message,
    type,
    relatedId = null,
    relatedType = null,
    priority = null,
    sendRealtime = true,
    actorId = null,
    actorName = null,
    metadata = {},
    enableGrouping = false,
    groupingWindowMinutes = 30,
  }) {
    try {
      // Auto-calculate priority if not provided
      const notificationPriority = priority || this.getPriority(type);
      const normalizedRelatedId = relatedId == null ? null : String(relatedId);

      const resolvedGroupKey = normalizedRelatedId && relatedType ? `${type}:${relatedType}:${normalizedRelatedId}` : null;
      const groupingEnabled = enableGrouping && resolvedGroupKey;

      let notification;

      if (groupingEnabled) {
        const windowStart = new Date(Date.now() - groupingWindowMinutes * 60 * 1000);
        notification = await Notification.findOne({
          userId,
          type,
          relatedId: normalizedRelatedId,
          relatedType,
          groupKey: resolvedGroupKey,
          isRead: false,
          createdAt: { $gte: windowStart },
        }).sort({ createdAt: -1 });
      }

      if (notification) {
        notification.groupCount = (notification.groupCount || 1) + 1;

        if (actorId) {
          const actorIdStr = actorId.toString();
          const actorIds = (notification.actorIds || []).map((id) => id.toString());
          if (!actorIds.includes(actorIdStr)) {
            notification.actorIds = [...(notification.actorIds || []), actorId];
          }
        }

        if (actorName) {
          const actorNames = notification.actorNames || [];
          if (!actorNames.includes(actorName)) {
            notification.actorNames = [...actorNames, actorName];
          }
          notification.latestActorName = actorName;
        }

        notification.actorCount = Math.max(
          (notification.actorIds || []).length,
          (notification.actorNames || []).length,
          notification.actorCount || 0,
          actorName ? 1 : 0,
        );

        notification.metadata = {
          ...(notification.metadata || {}),
          ...(metadata || {}),
        };
        notification.priority = notificationPriority;

        notification.message = this.buildGroupMessage(
          type,
          notification.metadata,
          notification.latestActorName || actorName || "Someone",
          notification.actorCount,
          message,
        );

        notification.title = this.buildGroupTitle(type, notification.actorCount, title);
        notification.createdAt = new Date();
        await notification.save();
      } else {
        // Save to database
        notification = await Notification.create({
          userId,
          title,
          message,
          type,
          priority: notificationPriority,
          relatedId: normalizedRelatedId,
          relatedType,
          groupKey: resolvedGroupKey,
          actorIds: actorId ? [actorId] : [],
          actorNames: actorName ? [actorName] : [],
          actorCount: actorName ? 1 : 0,
          groupCount: 1,
          latestActorName: actorName || null,
          metadata: metadata || {},
          isRead: false,
        });
      }

      // Send via WebSocket if enabled
      if (sendRealtime && this.io) {
        let realtimeRelatedId = notification.relatedId;
        const relatedIdAsString = notification.relatedId ? String(notification.relatedId) : null;
        if (notification.relatedType === "Task" && relatedIdAsString && /^[a-f\d]{24}$/i.test(relatedIdAsString)) {
          try {
            const task = await Task.findById(relatedIdAsString).select("key").lean();
            if (task?.key) {
              realtimeRelatedId = task.key;
            }
          } catch (taskLookupError) {
            console.error("[NotificationService] Failed to resolve task key for realtime payload:", taskLookupError.message);
          }
        }

        this.io.to(`user:${userId}`).emit("notification", {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          relatedId: realtimeRelatedId,
          relatedType: notification.relatedType,
          groupKey: notification.groupKey || null,
          actorCount: notification.actorCount || 0,
          groupCount: notification.groupCount || 1,
          latestActorName: notification.latestActorName || null,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          priority: notificationPriority,
        });

        // Also update unread count
        const unreadCount = await Notification.countDocuments({
          userId,
          isRead: false,
        });

        this.io.to(`user:${userId}`).emit("notification:unreadCount", unreadCount);
      }

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // ============================================
  // TASK NOTIFICATIONS
  // ============================================

  async notifyTaskAssigned({ taskId, taskKey, taskName, assigneeId, assignerName, projectKey }) {
    return this.createAndSend({
      userId: assigneeId,
      title: "New Task Assigned",
      message: `${assignerName} assigned you to task "${taskName}" in project ${projectKey}`,
      type: NotificationService.TYPES.TASK_ASSIGNED,
      relatedId: taskKey || taskId, // Use taskKey if provided, fallback to taskId
      relatedType: "Task",
    });
  }

  async notifyTaskCommented({ taskId, taskKey, taskName, commenterId, commenterName, commentPreview, recipientIds }) {
    const notifications = recipientIds.map((userId) =>
      this.createAndSend({
        userId,
        title: "New Comment on Task",
        message: `${commenterName} commented on "${taskName}": ${commentPreview}`,
        type: NotificationService.TYPES.TASK_COMMENTED,
        relatedId: taskKey || taskId,
        relatedType: "Task",
        actorId: commenterId,
        actorName: commenterName,
        metadata: { taskName },
        enableGrouping: true,
      }),
    );

    return Promise.all(notifications);
  }

  async notifyTaskUpdated({ taskId, taskKey, taskName, changedById = null, changedBy, recipientIds, changeSummary = null }) {
    const message = changeSummary ? `${changedBy} updated "${taskName}": ${changeSummary}` : `${changedBy} updated "${taskName}"`;

    const notifications = recipientIds.map((userId) =>
      this.createAndSend({
        userId,
        title: "Task Updated",
        message,
        type: NotificationService.TYPES.TASK_UPDATED,
        relatedId: taskKey || taskId,
        relatedType: "Task",
        actorId: changedById,
        actorName: changedBy,
        metadata: { taskName },
        enableGrouping: true,
      }),
    );

    return Promise.all(notifications);
  }

  async notifyTaskStatusChanged({ taskId, taskKey, taskName, oldStatus, newStatus, changedById = null, changedBy, recipientIds }) {
    const notifications = recipientIds.map((userId) =>
      this.createAndSend({
        userId,
        title: "Task Status Updated",
        message: `${changedBy} moved "${taskName}" from ${oldStatus} to ${newStatus}`,
        type: NotificationService.TYPES.TASK_STATUS_CHANGED,
        relatedId: taskKey || taskId,
        relatedType: "Task",
        actorId: changedById,
        actorName: changedBy,
        metadata: { taskName, oldStatus, newStatus },
        enableGrouping: true,
      }),
    );

    return Promise.all(notifications);
  }

  async notifyTaskPriorityChanged({ taskId, taskKey, taskName, oldPriority, newPriority, changedById = null, changedBy, recipientIds }) {
    // Only notify if priority increased to High or Critical
    if (!["High", "Critical"].includes(newPriority)) {
      return;
    }

    const notifications = recipientIds.map((userId) =>
      this.createAndSend({
        userId,
        title: "Task Priority Changed",
        message: `${changedBy} changed priority of "${taskName}" from ${oldPriority} to ${newPriority}`,
        type: NotificationService.TYPES.TASK_PRIORITY_CHANGED,
        relatedId: taskKey || taskId,
        relatedType: "Task",
        actorId: changedById,
        actorName: changedBy,
        metadata: { taskName, oldPriority, newPriority },
        enableGrouping: true,
      }),
    );

    return Promise.all(notifications);
  }

  async notifyTaskDeadlineSoon({ taskId, taskName, assigneeId, hoursLeft }) {
    return this.createAndSend({
      userId: assigneeId,
      title: "Task Deadline Approaching",
      message: `Task "${taskName}" is due in ${hoursLeft} hours`,
      type: NotificationService.TYPES.TASK_DEADLINE_SOON,
      relatedId: taskId,
      relatedType: "Task",
    });
  }

  async notifyTaskOverdue({ taskId, taskName, assigneeId, projectLeadId }) {
    const notifications = [assigneeId, projectLeadId]
      .filter((id) => id)
      .map((userId) =>
        this.createAndSend({
          userId,
          title: "Task Overdue",
          message: `Task "${taskName}" is overdue and not completed`,
          type: NotificationService.TYPES.TASK_OVERDUE,
          relatedId: taskId,
          relatedType: "Task",
        }),
      );

    return Promise.all(notifications);
  }

  // ============================================
  // PROJECT NOTIFICATIONS
  // ============================================

  async notifyProjectMemberAdded({ projectId, projectName, newMemberId, addedByName, role }) {
    return this.createAndSend({
      userId: newMemberId,
      title: "Added to Project",
      message: `${addedByName} added you to project "${projectName}" as ${role}`,
      type: NotificationService.TYPES.PROJECT_MEMBER_ADDED,
      relatedId: projectId,
      relatedType: "Project",
    });
  }

  async notifyProjectManagerAssigned({ projectId, projectName, projectManagerId, assignedByName }) {
    return this.createAndSend({
      userId: projectManagerId,
      title: "You are Project Manager",
      message: `${assignedByName} assigned you as Project Manager for project "${projectName}"`,
      type: NotificationService.TYPES.PROJECT_MEMBER_ADDED,
      relatedId: projectId,
      relatedType: "Project",
    });
  }

  async notifyProjectMemberRemoved({ projectId, projectName, removedMemberId }) {
    return this.createAndSend({
      userId: removedMemberId,
      title: "Removed from Project",
      message: `You have been removed from project "${projectName}"`,
      type: NotificationService.TYPES.PROJECT_MEMBER_REMOVED,
      relatedId: projectId,
      relatedType: "Project",
    });
  }

  async notifyProjectRoleChanged({ projectId, projectName, memberId, oldRole, newRole }) {
    return this.createAndSend({
      userId: memberId,
      title: "Project Role Changed",
      message: `Your role in "${projectName}" changed from ${oldRole} to ${newRole}`,
      type: NotificationService.TYPES.PROJECT_ROLE_CHANGED,
      relatedId: projectId,
      relatedType: "Project",
    });
  }

  // ============================================
  // SPRINT NOTIFICATIONS
  // ============================================

  async notifySprintStarted({ sprintId, sprintName, memberIds, taskCount }) {
    const notifications = memberIds.map((userId) =>
      this.createAndSend({
        userId,
        title: "Sprint Started",
        message: `Sprint "${sprintName}" has started. You have ${taskCount[userId] || 0} tasks`,
        type: NotificationService.TYPES.SPRINT_STARTED,
        relatedId: sprintId,
        relatedType: "Sprint",
      }),
    );

    return Promise.all(notifications);
  }

  async notifySprintEndingSoon({ sprintId, sprintName, memberIds, incompleteTasks }) {
    const notifications = memberIds.map((userId) =>
      this.createAndSend({
        userId,
        title: "Sprint Ending Soon",
        message: `Sprint "${sprintName}" ends in 1 day. You have ${incompleteTasks[userId] || 0} incomplete tasks`,
        type: NotificationService.TYPES.SPRINT_ENDING_SOON,
        relatedId: sprintId,
        relatedType: "Sprint",
      }),
    );

    return Promise.all(notifications);
  }

  async notifySprintCompleted({ sprintId, sprintName, memberIds, stats }) {
    const notifications = memberIds.map((userId) =>
      this.createAndSend({
        userId,
        title: "Sprint Completed",
        message: `Sprint "${sprintName}" completed. ${stats.completed}/${stats.total} tasks done`,
        type: NotificationService.TYPES.SPRINT_COMPLETED,
        relatedId: sprintId,
        relatedType: "Sprint",
      }),
    );

    return Promise.all(notifications);
  }

  // ============================================
  // GROUP NOTIFICATIONS
  // ============================================

  async notifyGroupMemberAdded({ groupId, groupName, newMemberId, addedByName }) {
    return this.createAndSend({
      userId: newMemberId,
      title: "Added to Group",
      message: `${addedByName} added you to group "${groupName}"`,
      type: NotificationService.TYPES.GROUP_MEMBER_ADDED,
      relatedId: groupId,
      relatedType: "Group",
    });
  }

  async notifyGroupMemberRemoved({ groupId, groupName, removedMemberId }) {
    return this.createAndSend({
      userId: removedMemberId,
      title: "Removed from Group",
      message: `You have been removed from group "${groupName}"`,
      type: NotificationService.TYPES.GROUP_MEMBER_REMOVED,
      relatedId: groupId,
      relatedType: "Group",
    });
  }

  // ============================================
  // MEETING NOTIFICATIONS
  // ============================================

  async notifyMeetingInvited({ meetingId, meetingTitle, invitedUserId, inviterName }) {
    return this.createAndSend({
      userId: invitedUserId,
      title: "Meeting Invitation",
      message: `${inviterName} invited you to meeting "${meetingTitle}"`,
      type: NotificationService.TYPES.MEETING_INVITED,
      relatedId: meetingId,
      relatedType: "Meeting",
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  // Get unread count for user
  async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({ userId, isRead: false });
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId = null) {
    try {
      const query = userId ? { _id: notificationId, userId } : { _id: notificationId };
      return await Notification.findOneAndUpdate(query, { isRead: true }, { new: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  // Mark all as read for user
  async markAllAsRead(userId) {
    try {
      return await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    } catch (error) {
      console.error("Error marking all as read:", error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
