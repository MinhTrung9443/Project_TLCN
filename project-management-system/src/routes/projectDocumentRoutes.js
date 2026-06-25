const express = require("express");
const router = express.Router();
const { protect, isProjectMember, isProjectManager } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const ProjectDocumentController = require("../controllers/ProjectDocumentController");

/**
 * @route   GET /api/projects/key/:projectKey/documents
 * @desc    List all documents in project (filtered by access)
 * @access  Private (Project Members)
 */
router.get("/key/:projectKey/documents", protect, isProjectMember, ProjectDocumentController.listDocuments);

/**
 * @route   POST /api/projects/key/:projectKey/documents
 * @desc    Upload new document to project (PM only)
 * @access  Private (Project Manager)
 */
router.post(
  "/key/:projectKey/documents",
  protect,
  isProjectMember,
  isProjectManager, // Check permission BEFORE upload to Cloudinary
  (req, res, next) => {
    console.log("🚀 [Route] POST /api/projects/key/:projectKey/documents - After auth & permission check");
    console.log("🚀 [Route] projectKey:", req.params.projectKey);
    console.log("🚀 [Route] user:", req.user?._id?.toString() || "NO USER");
    console.log("🚀 [Route] Content-Type:", req.headers["content-type"]);
    console.log("🚀 [Route] req.body:", req.body);
    console.log("🚀 [Route] file before upload:", req.file || "NO FILE YET");
    next();
  },
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("❌❌❌ [Route] Upload middleware error:", err);
        console.error("❌❌❌ [Route] Upload error message:", err.message);
        console.error("❌❌❌ [Route] Upload error name:", err.name);

        // Handle specific errors
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "File quá lớn! Kích thước tối đa là 10MB.",
            error: "File size exceeds 10MB limit",
          });
        }

        if (err.message && err.message.includes("File size too large")) {
          return res.status(400).json({
            message: "File quá lớn! Kích thước tối đa là 10MB.",
            error: "File size exceeds Cloudinary limit",
          });
        }

        return res.status(400).json({ message: "File upload failed", error: err.message });
      }
      console.log("🚀 [Route] After upload middleware - SUCCESS");
      console.log("🚀 [Route] file after upload:", req.file ? JSON.stringify(req.file, null, 2) : "NO FILE");
      console.log("🚀 [Route] req.body after upload:", req.body);
      next();
    });
  },
  ProjectDocumentController.uploadDocument,
);

/**
 * @route   PUT /api/projects/key/:projectKey/documents/:documentId/share
 * @desc    Share document with additional users (uploader only)
 * @access  Private (Document Uploader)
 */
router.put("/key/:projectKey/documents/:documentId/share", protect, isProjectMember, ProjectDocumentController.shareDocument);

/**
 * @route   PUT /api/projects/key/:projectKey/documents/:documentId/unshare
 * @desc    Unshare document from users (uploader only)
 * @access  Private (Document Uploader)
 */
router.put("/key/:projectKey/documents/:documentId/unshare", protect, isProjectMember, ProjectDocumentController.unshareDocument);

/**
 * @route   DELETE /api/projects/key/:projectKey/documents/:documentId
 * @desc    Delete project document (project docs only)
 * @access  Private (Project Members)
 */
router.delete("/key/:projectKey/documents/:documentId", protect, isProjectMember, ProjectDocumentController.deleteDocument);

/**
 * @route   GET /api/projects/key/:projectKey/documents/:documentId/summary
 * @desc    Summarize project document using AI
 * @access  Private (Project Members)
 */
router.get("/key/:projectKey/documents/:documentId/summary", protect, isProjectMember, ProjectDocumentController.summarizeDocument);

module.exports = router;
