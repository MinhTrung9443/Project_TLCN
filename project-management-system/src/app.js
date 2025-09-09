const express = require("express");
const app = express();
const appRoute = require("./routes/appRoute");

app.use(express.json());

app.use("/api", appRoute);

module.exports = app;
