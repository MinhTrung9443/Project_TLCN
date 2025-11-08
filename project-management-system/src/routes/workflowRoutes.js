const express = require("express");
const router = express.Router();
const workflowController = require("../controllers/WorkflowController");
const { protect } = require("../middleware/authMiddleware");

router.get("/default", protect, workflowController.getDefaultWorkflow);
router.get("/project/:projectKey", protect, workflowController.getWorkflowByProject);
router.get("/list", protect, workflowController.getAllStatuses);
router.get("/:workflowId", protect, workflowController.getWorkflowById);

// Statuses management
router.post("/:projectKey/statuses", protect, workflowController.addStatus);
router.put("/:projectKey/statuses/:statusId", protect, workflowController.updateStatus);
router.delete("/:projectKey/statuses/:statusId", protect, workflowController.deleteStatus);

// Transitions (rules) management
router.post("/:projectKey/transitions", protect, workflowController.addTransition);
router.put("/:projectKey/transitions/:transitionId", protect, workflowController.updateTransition);
router.delete("/:projectKey/transitions/:transitionId", protect, workflowController.deleteTransition);

module.exports = router;
