const express = require("express");
const router = express.Router();
const workflowController = require("../controllers/WorkflowController");
const { protect } = require("../middleware/authMiddleware");

router.get("/default", protect, workflowController.getDefaultWorkflow);
router.get("/:workflowId", protect, workflowController.getWorkflowById);
router.get("/list", protect, workflowController.getAllStatuses);

module.exports = router;
