const express = require("express");
const router = express.Router();
const ProjectReportController = require("../controllers/ProjectReportController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/project-report/key/:projectKey", ProjectReportController.generateProjectReportByProjectKey);
router.get("/project-report/id/:projectId", ProjectReportController.generateProjectReportByProjectId);
router.post("/project-report", ProjectReportController.generateProjectReport);

module.exports = router;
