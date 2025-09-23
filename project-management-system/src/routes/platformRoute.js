const express = require("express");
const router = express.Router();
const platformController = require("../controllers/PlatformController.js");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.get("/", protect, platformController.getAllPlatforms);

router.post("/", protect, isAdmin, platformController.createPlatform);

router.put("/:id", protect, isAdmin, platformController.updatePlatform);

router.delete("/:id", protect, isAdmin, platformController.deletePlatform);

router.get("/:id", protect, platformController.getPlatformById);

module.exports = router;
