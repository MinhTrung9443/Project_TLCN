const express = require("express");
const router = express.Router();
const groupController = require("../controllers/GroupController");
const { protect, admin } = require("../middleware/authMiddleware");

router.get("/", protect, groupController.getAllGroups);

router.post("/", protect, admin, groupController.createGroup);

router.put("/:id", protect, admin, groupController.updateGroup);

router.delete("/:id", protect, admin, groupController.deleteGroup);

router.get("/:id/members", protect, groupController.getMembers);

router.post("/:id/members", protect, admin, groupController.addMember);

router.delete("/:id/members/:userId", protect, admin, groupController.removeMember);

router.get("/:id", protect, groupController.getGroupById);

module.exports = router;
