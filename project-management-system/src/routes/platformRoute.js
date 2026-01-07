const express = require("express");
const router = express.Router();
const platformController = require("../controllers/PlatformController.js");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, platformController.getAllPlatforms);

router.post("/", protect, platformController.createPlatform);

router.put("/:id", protect, platformController.updatePlatform);

router.delete("/:id", protect, platformController.deletePlatform);

router.get("/:id", protect, platformController.getPlatformById);

module.exports = router;
