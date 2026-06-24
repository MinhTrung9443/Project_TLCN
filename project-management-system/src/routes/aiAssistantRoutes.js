const express = require("express");
const router = express.Router();
const aiAssistantController = require("../controllers/AIAssistantController");
const { protect } = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");

const aiAssistantLimiter = rateLimit({
	windowMs: Number(process.env.AI_ASSISTANT_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
	limit: Number(process.env.AI_ASSISTANT_RATE_LIMIT_MAX || 30),
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		message: "Bạn đang gửi quá nhiều yêu cầu AI. Vui lòng thử lại sau ít phút.",
	},
});

// Quản lý phiên chat
router.get("/sessions", protect, aiAssistantLimiter, aiAssistantController.getSessions);
router.post("/sessions", protect, aiAssistantLimiter, aiAssistantController.createSession);
router.get("/sessions/:sessionId/messages", protect, aiAssistantLimiter, aiAssistantController.getSessionMessages);
router.delete("/sessions/:sessionId", protect, aiAssistantLimiter, aiAssistantController.deleteSession);

// Route Cấp độ 1: Nhà Phân Tích
router.post("/analyze-risk", protect, aiAssistantLimiter, aiAssistantController.handleAnalyzeRisk);

// Route Cấp độ 2: Thư Ký (Tạo task)
router.post("/chat", protect, aiAssistantLimiter, aiAssistantController.handleChatCommand);

module.exports = router;