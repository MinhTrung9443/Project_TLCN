// File: app.js (Backend)

const express = require("express");
const cors = require("cors"); // Chỉ cần require một lần
const path = require("path");
const app = express();

// --- Import các routes ---
const appRoute = require("./routes/appRoute");
const userRoute = require("./routes/userRoutes");
const groupRoute = require("./routes/groupRoute");
const taskTypeRoute = require("./routes/taskTypeRoute.js");
const priorityRoute = require("./routes/priorityRoute.js");
const platformRoute = require("./routes/platformRoute.js");
const projectRoute = require("./routes/projectRoute");
const taskRoutes = require("./routes/taskRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const sprintRoute = require("./routes/sprintRoutes.js");
const workflowRoutes = require("./routes/workflowRoutes.js");
const ganttRoutes = require("./routes/ganttRoutes.js");

// --- Cấu hình CORS (Định nghĩa một lần, sử dụng nhiều lần) ---
const corsOptions = {
  origin: 'http://localhost:3000', // Cho phép origin này
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Đảm bảo có 'PATCH'
  allowedHeaders: ['Content-Type', 'Authorization'], // Các header được phép
  credentials: true
};

// --- Sử dụng Middlewares ---

// Sử dụng cấu hình CORS cho tất cả các request
app.use(cors(corsOptions));

// Bật xử lý pre-flight cho tất cả các route
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204); // No Content
  } else {
    next();
  }
});
app.use(express.json()); // Để parse body của request dạng JSON
app.use(express.static(path.join(__dirname, "public"))); // Phục vụ các file tĩnh

// --- Đăng ký các routes ---
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
app.use("/api/gantt", ganttRoutes);

module.exports = app;