require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/database.js");
const socketManager = require("./config/socket");
const summarizeQueue = require("./config/queue");
const summarizeWorker = require("./workers/summarizeWorker");

const PORT = process.env.PORT || 8080;

// Kết nối database
connectDB();

// Register queue worker
console.log("📋 Registering summarize worker...");
summarizeQueue.process(summarizeWorker);

// Queue event listeners
summarizeQueue.on("completed", (job, result) => {
  console.log(`✅ Job ${job.id} completed:`, result);
  // Emit WebSocket event for real-time update
  socketManager.io?.emit("summary:completed", {
    jobId: job.id,
    meetingId: result.meetingId,
    summaryId: result.summaryId,
    version: result.version,
  });
});

summarizeQueue.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
  // Emit WebSocket event for error update
  socketManager.io?.emit("summary:failed", {
    jobId: job.id,
    error: err.message,
    attempt: job.attemptsMade,
  });
});

summarizeQueue.on("error", (err) => {
  console.error("🔴 Queue error:", err);
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
socketManager.initialize(server);

// Khởi động server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔌 WebSocket ready on ws://localhost:${PORT}`);
  console.log(`⚙️ Summarize queue ready to process jobs`);
});
