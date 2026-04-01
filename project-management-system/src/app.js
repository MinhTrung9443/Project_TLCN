// File: app.js (Backend)

const express = require("express");
const cors = require("cors");
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
const aiAssistantRoutes = require("./routes/aiAssistantRoutes");
const webhookRouter = require('./routes/webhook');
const githubRoutes = require('./routes/githubRoutes');

// --- CẤU HÌNH CORS CHUẨN MỰC ---
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://127.0.0.1:3000", // Thêm IP local để ngừa lỗi Socket.IO
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Cho phép request không có origin (ví dụ server nội bộ, Socket polling) hoặc thuộc danh sách trắng
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // THAY ĐỔI QUAN TRỌNG: Không throw Error gây sập/spam log nữa, chỉ từ chối nhẹ nhàng
      console.warn(`[CORS] Từ chối truy cập từ Origin lạ: ${origin}`);
      callback(null, false); 
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true, // Cho phép cookie/token
}));

console.log("[CORS] Cấu hình hoàn tất, đã bảo vệ bằng Whitelist.");

// --- Sử dụng Middlewares ---

// Xử lý request dạng form-data (File Uploads)
app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    return next();
  }
  express.json()(req, res, next);
});

const uploadsPath = path.join(__dirname, "public", "uploads");
// Nếu có phục vụ file tĩnh, bỏ comment dòng dưới
// app.use("/uploads", express.static(uploadsPath));

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
app.use("/api/ai-assistant", aiAssistantRoutes);
app.use('/api/webhook', webhookRouter);
app.use('/api/github', githubRoutes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  console.log(`[404] ${req.method} ${req.path}`);
  next();
});

// --- Swagger ---
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
const docsUrl = process.env.PUBLIC_API_URL ? `${process.env.PUBLIC_API_URL}/api-docs` : "/api-docs";
console.log(`📄 Swagger Docs available at ${docsUrl}`);

module.exports = app;