const express = require("express");
const router = express.Router();
const priorityController = require("../controllers/PriorityController.js");
const { protect, admin } = require("../middleware/authMiddleware");

router.get("/", protect, priorityController.getAllPriorities);

router.post("/", protect, admin, priorityController.createPriority);

router.put('/levels/:projectKey', priorityController.updatePriorityLevels);


router.put("/:id", protect, admin, priorityController.updatePriority);

router.delete("/:id", protect, admin, priorityController.deletePriority);

router.get("/:id", protect, priorityController.getPriorityById);
router.get("/list", protect, priorityController.getPriorityList);
module.exports = router;
