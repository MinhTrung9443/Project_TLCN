const express = require("express");
const app = express();
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
const cors = require("cors");
const path = require("path");
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
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

module.exports = app;
