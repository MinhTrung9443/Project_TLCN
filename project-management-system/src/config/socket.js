const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const notificationService = require("../services/NotificationService");

class SocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
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
        await notificationService.markAsRead(notificationId);
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

    // Handle sending new message
    socket.on("new message", (newMessageReceived) => {
      var chat = newMessageReceived.conversationId;

      if (!chat) return console.log("Chat.conversationId not defined");

      socket.in(chat._id).emit("message received", newMessageReceived);
      
    
    });

    socket.on("typing", (room) => {
        socket.in(room).emit("typing", room); 
    });
    socket.on("stop typing", (room) => {
        socket.in(room).emit("stop typing", room);
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
