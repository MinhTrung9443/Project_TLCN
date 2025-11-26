const Notification = require("../models/Notification");
const notificationService = require("../services/NotificationService");

class NotificationController {
  // Get all notifications for current user
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;

      const query = { userId };
      if (unreadOnly === "true") {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      // Populate Task to get key if relatedType is Task
      const Task = require("../models/Task");
      const notificationsWithKey = await Promise.all(
        notifications.map(async (notif) => {
          if (notif.relatedType === "Task" && notif.relatedId) {
            try {
              const task = await Task.findById(notif.relatedId).select("key").lean();
              if (task && task.key) {
                return { ...notif, relatedId: task.key }; // Replace ID with key
              }
            } catch (err) {
              console.error("Error fetching task key:", err);
            }
          }
          return notif;
        })
      );

      const total = await Notification.countDocuments(query);
      const hasMore = page * limit < total;

      res.status(200).json({
        notifications: notificationsWithKey,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasMore,
      });
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ message: error.message });
    }
  }

  // Get unread count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const count = await notificationService.getUnreadCount(userId);
      res.status(200).json({ count });
    } catch (error) {
      console.error("Error getting unread count:", error);
      res.status(500).json({ message: error.message });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOne({ _id: id, userId });

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      notification.isRead = true;
      await notification.save();

      res.status(200).json({ message: "Notification marked as read", notification });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: error.message });
    }
  }

  // Mark all as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      await notificationService.markAllAsRead(userId);

      res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all as read:", error);
      res.status(500).json({ message: error.message });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOneAndDelete({ _id: id, userId });

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.status(200).json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: error.message });
    }
  }

  // Delete all read notifications
  async deleteAllRead(req, res) {
    try {
      const userId = req.user.id;

      const result = await Notification.deleteMany({ userId, isRead: true });

      res.status(200).json({
        message: "All read notifications deleted",
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      console.error("Error deleting read notifications:", error);
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = new NotificationController();
