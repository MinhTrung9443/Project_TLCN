const Queue = require("bull");

// Create summarize queue
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
console.log("[Queue] Using Redis URL:", redisUrl);
const summarizeQueue = new Queue("summarize", redisUrl);

let isQueueReady = false;

// Configure queue events
summarizeQueue.on("ready", () => {
  isQueueReady = true;
  console.log("✅ Queue connected to Redis");
});

// Immediate readiness check on startup
summarizeQueue
  .isReady()
  .then(() => {
    isQueueReady = true;
    console.log("✅ Queue ready on startup");
  })
  .catch((err) => {
    console.error("[Queue] Startup readiness check failed:", err.message);
  });

summarizeQueue.on("error", (err) => {
  if (!isQueueReady && err.code === "ECONNREFUSED") {
    console.warn("[Queue] ⚠️  Redis not available - Summary feature disabled");
    console.warn("[Queue] To enable summaries, start Redis: docker run -d -p 6379:6379 redis:latest");
  } else {
    console.error("[Queue Error]", err);
  }
});

summarizeQueue.on("failed", (job, err) => {
  console.error(`[Queue] Job ${job.id} failed:`, err.message);
});

summarizeQueue.on("completed", (job) => {
  console.log(`[Queue] Job ${job.id} completed`);
});

summarizeQueue.on("active", (job) => {
  console.log(`[Queue] Job ${job.id} started processing`);
});

// Process queue events for logging
summarizeQueue.on("progress", (job, progress) => {
  console.log(`[Queue] Job ${job.id} progress:`, progress);
});

module.exports = summarizeQueue;
module.exports.isQueueReady = () => isQueueReady;
