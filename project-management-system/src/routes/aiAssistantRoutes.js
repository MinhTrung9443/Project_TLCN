const express = require("express");
const router = express.Router();
const aiAssistantController = require("../controllers/AIAssistantController");
const { protect } = require("../middleware/authMiddleware");

// Route Cấp độ 1: Nhà Phân Tích
router.post("/analyze-risk", protect, aiAssistantController.handleAnalyzeRisk);

// Route Cấp độ 2: Thư Ký (Tạo task)
router.post("/chat", protect, aiAssistantController.handleChatCommand);

module.exports = router;