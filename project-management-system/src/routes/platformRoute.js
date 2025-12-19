const express = require("express");
const router = express.Router();
const platformController = require("../controllers/PlatformController.js");
const { protect, admin, adminOrProjectPM } = require("../middleware/authMiddleware");

router.get("/", protect, platformController.getAllPlatforms);

router.post("/", protect, adminOrProjectPM, platformController.createPlatform);

router.put("/:id", protect, adminOrProjectPM, platformController.updatePlatform);

router.delete("/:id", protect, adminOrProjectPM, platformController.deletePlatform);

router.get("/:id", protect, platformController.getPlatformById);

module.exports = router;
