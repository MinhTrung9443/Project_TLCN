// src/routes/CommentRoutes.js
const express = require("express");
const router = express.Router();
const { 
    handleUpdateComment, 
    handleDeleteComment 
} = require("../controllers/CommentController");
const { protect } = require("../middleware/authMiddleware"); 

router.put("/:commentId", protect, handleUpdateComment);

router.delete("/:commentId", protect, handleDeleteComment);

module.exports = router;