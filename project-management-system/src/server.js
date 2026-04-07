require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/database.js");
const automationQueue = require("./config/automationQueue");
const { ensureAutomationJobs } = require("./config/automationQueue");
const socketManager = require("./config/socket");
const summarizeQueue = require("./config/queue");
const automationService = require("./services/AutomationService");
const summarizeWorker = require("./workers/summarizeWorker");

const PORT = process.env.PORT || 8080;

// Kết nối database
connectDB();

// Register queue worker
console.log("📋 Registering summarize worker...");
summarizeQueue.process(summarizeWorker);

console.log("⚙️ Registering automation workers...");
automationQueue.process("meeting-status-sync", 1, async () => automationService.syncMeetingsToOngoing());
automationQueue.process("meeting-reminders", 1, async () => automationService.sendMeetingReminders());
automationQueue.process("task-deadline-monitor", 1, async () => automationService.monitorTaskDeadlines());
automationQueue.process("sprint-lifecycle-monitor", 1, async () => automationService.monitorSprintLifecycle());

ensureAutomationJobs()
  .then(() => {
    console.log("🗓️ Automation jobs scheduled");
  })
  .catch((error) => {
    console.error("Failed to schedule automation jobs:", error.message);
  });

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

automationQueue.on("completed", (job, result) => {
  console.log(`✅ Automation job ${job.name} completed:`, result);
});

automationQueue.on("failed", (job, err) => {
  console.error(`❌ Automation job ${job?.name || job?.id} failed:`, err.message);
});

automationQueue.on("error", (err) => {
  console.error("🔴 Automation queue error:", err);
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
socketManager.initialize(server);

// Khởi động server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log("🔌 WebSocket ready");
  console.log(`⚙️ Summarize queue ready to process jobs`);
  console.log(`⚙️ Automation queue ready to process jobs`);
});
