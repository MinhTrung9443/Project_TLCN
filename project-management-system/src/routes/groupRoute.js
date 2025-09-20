const express = require('express');
const router = express.Router();
const groupController = require('../controllers/GroupController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.get('/', protect, groupController.getAllGroups);

router.post('/', protect, isAdmin, groupController.createGroup);

router.put('/:id', protect, isAdmin, groupController.updateGroup);

router.delete('/:id', protect, isAdmin, groupController.deleteGroup);

router.get('/:id/members', protect, groupController.getMembers);

router.post('/:id/members', protect, isAdmin, groupController.addMember);

router.get('/:id', protect, groupController.getGroupById);


module.exports = router;