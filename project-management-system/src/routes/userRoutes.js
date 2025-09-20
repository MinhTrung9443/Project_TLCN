const express = require('express');
const router = express.Router();
const userController = require('../controllers/UserController');
const { protect } = require('../middleware/authMiddleware');

router.put('/profile', protect, userController.updateProfile);
router.get('/', protect, userController.getUsers);

module.exports = router;