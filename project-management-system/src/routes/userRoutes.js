// src/routes/userRoutes.js
// [ĐÃ SỬA]

const express = require("express");
const router = express.Router();
const userController = require("../controllers/UserController");
const { protect, admin } = require("../middleware/authMiddleware");

router.put("/profile", protect, userController.updateProfile);
router.get("/get-all-users", protect, userController.getAllUsers);

// SỬA LẠI THỨ TỰ MIDDLEWARE Ở CÁC ROUTE DƯỚI ĐÂY
router.post("/delete-user/:id", protect, admin, userController.deleteUser);
router.post("/update-user/:id", protect, admin, userController.updateUserInfo);
router.post("/create-user", protect, admin, userController.addUser);

router.get("/get-user/:id", protect, userController.getUserById);
router.get('/', protect, userController.getUsers);

module.exports = router;