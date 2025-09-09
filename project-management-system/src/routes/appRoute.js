const express = require("express");
const appRoute = express.Router();
const authController = require("../controllers/AuthController");

appRoute.post("/login", authController.login);
appRoute.post("/forgot-password", authController.forgotPassword);
appRoute.post("/reset-password", authController.resetPassword);

module.exports = appRoute;
