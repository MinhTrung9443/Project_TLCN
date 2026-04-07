const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const notificationService = require("../services/NotificationService");
const Message = require("../models/Message");

class SocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Set IO instance in notification service
    notificationService.setIO(this.io);

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];

        if (!token) {
          return next(new Error("Authentication error: No token provided"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userEmail = decoded.email;

        next();
      } catch (error) {
        console.error("Socket authentication error:", error.message);
        next(new Error("Authentication error: Invalid token"));
      }
    });

    // Connection handler
    this.io.on("connection", (socket) => {
      this.handleConnection(socket);
    });

    console.log("✅ Socket.IO initialized successfully");
  }

  handleConnection(socket) {
    const userId = socket.userId;

    console.log(`🔌 User connected: ${userId} (${socket.userEmail})`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Track connected user
    this.connectedUsers.set(userId, socket.id);

    // Send unread count on connection
    this.sendUnreadCount(userId);

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`🔌 User disconnected: ${userId}`);
      this.connectedUsers.delete(userId);
    });

    // Handle mark as read
    socket.on("notification:read", async (notificationId) => {
      try {
        await notificationService.markAsRead(notificationId, userId);
        this.sendUnreadCount(userId);
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    });

    // Handle mark all as read
    socket.on("notification:readAll", async () => {
      try {
        await notificationService.markAllAsRead(userId);
        this.sendUnreadCount(userId);
      } catch (error) {
        console.error("Error marking all as read:", error);
      }
    });

    // Handle join project room (for project-wide notifications)
    socket.on("project:join", (projectId) => {
      socket.join(`project:${projectId}`);
      console.log(`📁 User ${userId} joined project room: ${projectId}`);
    });

    // Handle leave project room
    socket.on("project:leave", (projectId) => {
      socket.leave(`project:${projectId}`);
      console.log(`📁 User ${userId} left project room: ${projectId}`);
    });

    // Handle join task room (for task watchers)
    socket.on("task:join", (taskId) => {
      socket.join(`task:${taskId}`);
      console.log(`📋 User ${userId} watching task: ${taskId}`);
    });

    // Handle leave task room
    socket.on("task:leave", (taskId) => {
      socket.leave(`task:${taskId}`);
      console.log(`📋 User ${userId} stopped watching task: ${taskId}`);
    });
    // ---------------- CHAT Functionality ----------------
    // Handle user join a specific conversation room
    socket.on("join chat", (room) => {
      socket.join(room);
      console.log(`User ${userId} joined chat room: ${room}`);
    });

    // TRONG FILE: SocketManager.js (Server)

    socket.on("new message", (newMessageReceived) => {
      try {
        const chat = newMessageReceived.conversationId;
        const senderId = newMessageReceived.sender._id || newMessageReceived.sender;
        const conversationIdStr = chat._id ? chat._id.toString() : chat.toString();

        // ---------------------------------------------------------
        // CÁCH 1: Gửi Realtime cho những người ĐANG MỞ đoạn chat này (Quan trọng cho Group/Project)
        // ---------------------------------------------------------
        // Bất kỳ ai đã chạy socket.emit('join chat', conversationId) sẽ nhận được
        socket.to(conversationIdStr).emit("message received", newMessageReceived);

        // ---------------------------------------------------------
        // CÁCH 2: Gửi Notification cho Chat 1-1 (Direct) hoặc khi người dùng đang ở trang khác
        // ---------------------------------------------------------
        if (chat.participants && chat.participants.length > 0) {
          chat.participants.forEach((participant) => {
            const pId = participant._id ? participant._id.toString() : participant.toString();
            const sId = senderId.toString();

            if (pId === sId) return; // Không gửi cho chính mình

            // Chỉ gửi vào room cá nhân nếu đây là chat 1-1 (để hiện noti)
            // Hoặc bạn có thể giữ logic này cho cả Group nếu muốn hiện noti đỏ trên menu
            this.io.to(`user:${pId}`).emit("message received", newMessageReceived);
          });
        }
      } catch (error) {
        console.error("❌ Error new message:", error);
      }
    });
    socket.on("mark as read", async ({ conversationId, userId }) => {
      // LOG ĐỂ DEBUG: Xem server có nhận được lệnh không
      console.log(`👁️ SERVER: User ${userId} mark read conversation ${conversationId}`);

      try {
        // 1. Update Database
        await Message.updateMany(
          {
            conversationId: conversationId,
            readBy: { $ne: userId },
          },
          { $addToSet: { readBy: userId } },
        );

        // 2. CHUYỂN ID SANG STRING ĐỂ GỬI ROOM
        const roomName = conversationId.toString();

        console.log(`📡 SERVER: Bắn tin 'message read' vào room: ${roomName}`);

        // Gửi cho tất cả người đang mở đoạn chat này (trừ người vừa đọc)
        socket.to(roomName).emit("message read", {
          conversationId: roomName,
          readerId: userId,
        });
      } catch (error) {
        console.error("❌ SERVER Error:", error);
      }
    });

    socket.on("typing", (room) => {
      socket.in(room).emit("typing", room);
    });
    socket.on("stop typing", (room) => {
      socket.in(room).emit("stop typing", room);
    });

    // Handle recall message
    socket.on("recall message", ({ conversationId, messageId }) => {
      const roomName = conversationId._id ? conversationId._id.toString() : conversationId.toString();
      socket.to(roomName).emit("message recalled", { messageId: messageId.toString() });
    });

    // Handle reaction
    socket.on("send reaction", ({ conversationId, messageId, reaction, userId }) => {
      const roomName = conversationId.toString();
      socket.to(roomName).emit("message reaction update", {
        messageId,
        reaction,
        userId,
      });
    });
  }

  async sendUnreadCount(userId) {
    try {
      const count = await notificationService.getUnreadCount(userId);
      this.io.to(`user:${userId}`).emit("notification:unreadCount", count);
    } catch (error) {
      console.error("Error sending unread count:", error);
    }
  }

  sendToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  sendToProject(projectId, event, data) {
    this.io.to(`project:${projectId}`).emit(event, data);
  }

  sendToTask(taskId, event, data) {
    this.io.to(`task:${taskId}`).emit(event, data);
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  getIO() {
    return this.io;
  }
}

module.exports = new SocketManager();
