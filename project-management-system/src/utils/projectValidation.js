const Project = require("../models/Project");

/**
 * Check if a project is completed by project ID
 * @param {String} projectId - MongoDB ObjectId of the project
 * @returns {Promise<Boolean>} - true if project is completed
 */
const isProjectCompletedById = async (projectId) => {
  if (!projectId) return false;
  const project = await Project.findById(projectId);
  return project && project.status === "completed";
};

/**
 * Check if a project is completed by project key
 * @param {String} projectKey - Project key (e.g., "PROJ-1")
 * @returns {Promise<Boolean>} - true if project is completed
 */
const isProjectCompletedByKey = async (projectKey) => {
  if (!projectKey) return false;
  const project = await Project.findOne({ key: projectKey.toUpperCase() });
  return project && project.status === "completed";
};

/**
 * Middleware to check if project is completed and block the request
 * Use this for routes with projectKey in params
 */
const blockIfProjectCompleted = async (req, res, next) => {
  try {
    const projectKey = req.params.projectKey;
    if (!projectKey) {
      return next();
    }

    const isCompleted = await isProjectCompletedByKey(projectKey);
    if (isCompleted) {
      return res.status(403).json({
        message: "Cannot modify a completed project",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  isProjectCompletedById,
  isProjectCompletedByKey,
  blockIfProjectCompleted,
};
