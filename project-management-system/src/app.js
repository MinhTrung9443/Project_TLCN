// File: app.js (Backend)

const express = require("express");
const cors = require("cors"); // Chỉ cần require một lần
const path = require("path");
const app = express();

// --- Import các routes ---

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const appRoute = require("./routes/appRoute");
const userRoute = require("./routes/userRoutes");
const groupRoute = require("./routes/groupRoute");
const taskTypeRoute = require("./routes/taskTypeRoute.js");
const priorityRoute = require("./routes/priorityRoute.js");
const platformRoute = require("./routes/platformRoute.js");
const projectRoute = require("./routes/projectRoute");
const projectDocumentRoutes = require("./routes/projectDocumentRoutes");
const taskRoutes = require("./routes/taskRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const sprintRoute = require("./routes/sprintRoutes.js");
const workflowRoutes = require("./routes/workflowRoutes.js");
const ganttRoutes = require("./routes/ganttRoutes.js");
const commentRoutes = require("./routes/commentRoute.js");
const dashboardRoutes = require("./routes/dashboardRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const timeLogRoutes = require("./routes/timeLogRoutes");
const performanceRoutes = require("./routes/performanceRoutes");
const meetingRoutes = require("./routes/meetingRoutes.js");
const summaryRoutes = require("./routes/summaryRoutes.js");
const chatRoute = require("./routes/chatRoute");
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

console.log("[CORS] Configured for origin:", corsOptions.origin);

// --- Sử dụng Middlewares ---

// Sử dụng cấu hình CORS cho tất cả các request
app.use(cors(corsOptions));

// Bật xử lý pre-flight và set headers CORS thủ công
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", corsOptions.origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Skip JSON parsing for multipart/form-data requests (file uploads)
app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    console.log("[MIDDLEWARE] Skipping JSON parse for multipart request");
    return next();
  }
  express.json()(req, res, next);
});

const uploadsPath = path.join(__dirname, "public", "uploads");

// --- Đăng ký các routes ---
app.use("/api", appRoute);
app.use("/api/users", userRoute);
app.use("/api/groups", groupRoute);
app.use("/api/task-types", taskTypeRoute);
app.use("/api/priorities", priorityRoute);
app.use("/api/platforms", platformRoute);
app.use("/api/projects", projectRoute);
app.use("/api/projects", projectDocumentRoutes);
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
app.use("/api/meetings", meetingRoutes);
app.use("/api/summaries", summaryRoutes);
app.use("/api/chats", chatRoute);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
console.log("📄 Swagger Docs available at http://localhost:8080/api-docs");

module.exports = app;
