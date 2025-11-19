const express = require("express");
const router = express.Router();
const platformController = require("../controllers/PlatformController.js");
const { protect, admin } = require("../middleware/authMiddleware");

router.get("/", protect, platformController.getAllPlatforms);

router.post("/", protect, admin, platformController.createPlatform);

router.put("/:id", protect, admin, platformController.updatePlatform);

router.delete("/:id", protect, admin, platformController.deletePlatform);

router.get("/:id", protect, platformController.getPlatformById);

module.exports = router;
