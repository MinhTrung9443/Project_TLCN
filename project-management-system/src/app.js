// File: app.js (Backend)

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// --- Import routes ---
const appRoute = require("./routes/appRoute");
const userRoute = require("./routes/userRoutes");
const groupRoute = require("./routes/groupRoute");
const taskTypeRoute = require("./routes/taskTypeRoute");
const priorityRoute = require("./routes/priorityRoute");
const platformRoute = require("./routes/platformRoute");
const projectRoute = require("./routes/projectRoute");
const taskRoutes = require("./routes/taskRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const sprintRoute = require("./routes/sprintRoutes");
const workflowRoutes = require("./routes/workflowRoutes");
const ganttRoutes = require("./routes/ganttRoutes");
const commentRoutes = require("./routes/commentRoute");
const dashboardRoutes = require("./routes/dashboardRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const timeLogRoutes = require("./routes/timeLogRoutes");
const performanceRoutes = require("./routes/performanceRoutes");

// ===== CORS – Cho phép mọi origin =====
app.use(
  cors({
    origin: true, // Cho phép tất cả origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// ========================================

app.use(express.json());

const uploadsPath = path.join(__dirname, "public", "uploads");

// --- Routes ---
app.use("/api", appRoute);
app.use("/api/users", userRoute);
app.use("/api/groups", groupRoute);
app.use("/api/task-types", taskTypeRoute);
app.use("/api/priorities", priorityRoute);
app.use("/api/platforms", platformRoute);
app.use("/api/projects", projectRoute);
app.use("/api/tasks", taskRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/sprints", sprintRoute);
app.use("/api/workflows", workflowRoutes);
app.use("/api/auditlog", auditLogRoutes);
app.use("/api/gantt", ganttRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/timelogs", timeLogRoutes);
app.use("/api/performance", performanceRoutes);

module.exports = app;
