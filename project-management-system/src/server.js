require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/database.js");
const socketManager = require("./config/socket");

const PORT = process.env.PORT || 8080;

// Kết nối database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
socketManager.initialize(server);

// Khởi động server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔌 WebSocket ready on ws://localhost:${PORT}`);
});
