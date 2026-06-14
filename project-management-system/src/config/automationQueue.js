const Queue = require("bull");

const redisUrl = process.env.REDIS_URL;
const automationQueueName = process.env.AUTOMATION_QUEUE_NAME;

console.log("[AutomationQueue] Using Redis URL:", redisUrl);
console.log("[AutomationQueue] Using queue name:", automationQueueName);

const automationQueue = new Queue(automationQueueName, redisUrl);

let isQueueReady = false;

automationQueue.on("ready", () => {
  isQueueReady = true;
  console.log("✅ Automation queue connected to Redis");
});

automationQueue
  .isReady()
  .then(() => {
    isQueueReady = true;
    console.log("✅ Automation queue ready on startup");
  })
  .catch((err) => {
    console.error("[AutomationQueue] Startup readiness check failed:", err.message);
  });

automationQueue.on("error", (err) => {
  if (!isQueueReady && err.code === "ECONNREFUSED") {
    console.warn("[AutomationQueue] ⚠️ Redis not available - Automation jobs disabled");
  } else {
    console.error("[AutomationQueue Error]", err);
  }
});

automationQueue.on("failed", (job, err) => {
  console.error(`[AutomationQueue] Job ${job.id} (${job.name}) failed:`, err.message);
});

automationQueue.on("completed", (job) => {
  console.log(`[AutomationQueue] Job ${job.id} (${job.name}) completed`);
});

const repeatableJobs = [
  {
    name: "meeting-status-sync",
    cron: process.env.MEETING_STATUS_SYNC_CRON,
  },
  {
    name: "meeting-reminders",
    cron: process.env.MEETING_REMINDER_CRON,
  },
  {
    name: "task-deadline-monitor",
    cron: process.env.TASK_DEADLINE_MONITOR_CRON,
  },
  {
    name: "sprint-lifecycle-monitor",
    cron: process.env.SPRINT_LIFECYCLE_CRON,
  },
];

async function ensureAutomationJobs() {
  // Ensure the queue is ready before scheduling repeatable jobs.
  try {
    if (!isQueueReady) {
      await automationQueue.isReady();
      isQueueReady = true;
    }
  } catch (err) {
    console.warn("[AutomationQueue] Could not connect to Redis; skipping scheduling repeatable jobs.", err.message || err);
    return;
  }

  for (const jobConfig of repeatableJobs) {
    try {
      await automationQueue.add(
        jobConfig.name,
        {},
        {
          jobId: `repeat:${jobConfig.name}`,
          repeat: { cron: jobConfig.cron },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (err) {
      console.warn(`[AutomationQueue] Failed to add repeatable job ${jobConfig.name}:`, err.message || err);
    }
  }
}

module.exports = automationQueue;
module.exports.ensureAutomationJobs = ensureAutomationJobs;
module.exports.isQueueReady = () => isQueueReady;
