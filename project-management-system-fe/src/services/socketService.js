import { io } from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:8080";

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      console.log("✅ Socket connected");

      // Register any pending listeners
      this.listeners.forEach((callback, event) => {
        this.socket.on(event, callback);
      });
    });

    this.socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket?.connected) {
      this.socket.on(event, callback);
    }
  }

  off(event) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  // Notification specific methods
  markAsRead(notificationId) {
    this.emit("notification:read", notificationId);
  }

  markAllAsRead() {
    this.emit("notification:readAll");
  }

  joinProject(projectId) {
    this.emit("project:join", projectId);
  }

  leaveProject(projectId) {
    this.emit("project:leave", projectId);
  }

  joinTask(taskId) {
    this.emit("task:join", taskId);
  }

  leaveTask(taskId) {
    this.emit("task:leave", taskId);
  }
}

const socketServiceInstance = new SocketService();
export default socketServiceInstance;
