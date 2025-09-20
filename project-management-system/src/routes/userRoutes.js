const express = require("express");
const router = express.Router();
const userController = require("../controllers/UserController");
const { protect, admin } = require("../middleware/authMiddleware");

router.put("/profile", protect, userController.updateProfile);
router.get("/get-all-users", protect, userController.getAllUsers);
router.post("/delete-user/:id", admin, userController.deleteUser);
router.post("/update-user/:id", admin, userController.updateUserInfo);
router.get("/get-user/:id", protect, userController.getUserById);
router.post("/create-user", admin, userController.addUser);
router.get('/', protect, userController.getUsers);

module.exports = router;
