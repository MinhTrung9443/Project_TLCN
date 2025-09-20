const express = require("express");
const app = express();
const appRoute = require("./routes/appRoute");
const userRoute = require("./routes/userRoutes");
const groupRoute = require("./routes/groupRoute")

const cors = require("cors");

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

app.use("/api", appRoute);
app.use('/api/users', userRoute);
app.use('/api/groups', groupRoute);

module.exports = app;
