const express = require("express");
const app = express();
const appRoute = require("./routes/appRoute");
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

module.exports = app;
