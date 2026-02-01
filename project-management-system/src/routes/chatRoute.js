/* src/routes/chatRoutes.js */
const express = require("express");
const router = express.Router();
const ChatController = require("../controllers/ChatController");
const authMiddleware = require("../middleware/authMiddleware");

// Middleware bảo vệ
router.use(authMiddleware.protect);

/**
 * @swagger
 * tags:
 *   name: Chats
 *   description: API quản lý Chat (1-1, Project, Team)
 */

/**
 * @swagger
 * /api/chats:
 *   post:
 *     summary: Tạo hoặc truy cập cuộc trò chuyện 1-1 (Individual)
 *     tags: [Chats]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID của người dùng muốn chat cùng
 *     responses:
 *       200:
 *         description: Thông tin cuộc trò chuyện (Conversation)
 *       400:
 *         description: Thiếu userId
 */
router.post("/", ChatController.accessChat);

/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Lấy danh sách các cuộc trò chuyện 1-1 của User hiện tại
 *     tags: [Chats]
 *     responses:
 *       200:
 *         description: Danh sách Conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                    _id: { type: string }
 *                    latestMessage: { $ref: '#/components/schemas/Message' }
 *                    participants: { type: array }
 */
router.get("/", ChatController.fetchChats);

/**
 * @swagger
 * /api/chats/project/{projectId}:
 *   get:
 *     summary: Lấy danh sách các kênh chat của Dự án (Kênh chung + Team chats)
 *     tags: [Chats]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Object chứa danh sách kênh
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 general:
 *                   description: Kênh chat chung (Toàn bộ dự án)
 *                   type: object
 *                 teams:
 *                   description: Danh sách các kênh chat của các Teams mà User thuộc về
 *                   type: array
 *       403:
 *         description: Không có quyền truy cập dự án
 */
router.get("/project/:projectId", ChatController.getProjectChannels);

/**
 * @swagger
 * /api/chats/message:
 *   post:
 *     summary: Gửi tin nhắn mới
 *     tags: [Chats]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *             properties:
 *               content:
 *                 type: string
 *                 description: Nội dung tin nhắn (Bắt buộc nếu không có attachments)
 *               conversationId:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                      url: { type: string }
 *                      type: { type: string, enum: ['image', 'video', 'raw', 'audio'] }
 *                      name: { type: string }
 *     responses:
 *       200:
 *         description: Tin nhắn vừa gửi thành công (đầy đủ thông tin sender)
 */
router.post("/message", ChatController.sendMessage);

/**
 * @swagger
 * /api/chats/{conversationId}/messages:
 *   get:
 *     summary: Lấy lịch sử tin nhắn của một cuộc hội thoại
 *     tags: [Chats]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 */
router.get("/:conversationId/messages", ChatController.allMessages);

module.exports = router;