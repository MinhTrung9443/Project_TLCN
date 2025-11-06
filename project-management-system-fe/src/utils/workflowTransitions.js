/**
 * Workflow Transition Validator
 * Kiểm tra xem có thể chuyển task từ status này sang status khác không
 */

/**
 * Check if transition is allowed based on workflow transitions
 * @param {Object} workflow - Workflow object containing transitions
 * @param {string} fromStatusId - Current status ID
 * @param {string} toStatusId - Target status ID
 * @returns {boolean} - True if transition is allowed
 */
export const isTransitionAllowed = (workflow, fromStatusId, toStatusId) => {
  // Debug logging
  console.log("=== Transition Check ===");
  console.log("From Status ID:", fromStatusId);
  console.log("To Status ID:", toStatusId);
  console.log("Workflow:", workflow);

  if (!workflow || !workflow.transitions || workflow.transitions.length === 0) {
    // If no workflow or transitions defined, allow all transitions
    console.log("No workflow transitions defined, allowing all transitions");
    return true;
  }

  // Allow staying in the same status
  if (fromStatusId === toStatusId) {
    console.log("Same status, allowing");
    return true;
  }

  // Normalize IDs to strings for comparison
  const normalizeId = (id) => {
    if (!id) return null;
    if (typeof id === "string") return id;
    if (id.$oid) return id.$oid;
    if (id._id) return id._id.toString();
    return id.toString();
  };

  const normalizedFromId = normalizeId(fromStatusId);
  const normalizedToId = normalizeId(toStatusId);

  console.log("Normalized From:", normalizedFromId);
  console.log("Normalized To:", normalizedToId);

  // Check if there's a transition rule for this move
  const hasTransition = workflow.transitions.some((transition) => {
    const transitionFromId = normalizeId(transition.from);
    const transitionToId = normalizeId(transition.to);

    console.log(`Checking transition: ${transitionFromId} -> ${transitionToId}`);

    return transitionFromId === normalizedFromId && transitionToId === normalizedToId;
  });

  console.log("Has transition:", hasTransition);
  return hasTransition;
};

/**
 * Get all allowed target statuses for a given status
 * @param {Object} workflow - Workflow object containing transitions
 * @param {string} fromStatusId - Current status ID
 * @returns {Array} - Array of allowed target status IDs
 */
export const getAllowedTransitions = (workflow, fromStatusId) => {
  if (!workflow || !workflow.transitions) {
    return [];
  }

  // Normalize IDs to strings for comparison
  const normalizeId = (id) => {
    if (!id) return null;
    if (typeof id === "string") return id;
    if (id.$oid) return id.$oid;
    if (id._id) return id._id.toString();
    return id.toString();
  };

  const normalizedFromId = normalizeId(fromStatusId);

  const allowedStatusIds = workflow.transitions
    .filter((transition) => {
      const transitionFromId = normalizeId(transition.from);
      return transitionFromId === normalizedFromId;
    })
    .map((transition) => normalizeId(transition.to));

  return allowedStatusIds;
};

/**
 * Get transition error message
 * @param {string} fromStatusName - Current status name
 * @param {string} toStatusName - Target status name
 * @returns {string} - Error message
 */
export const getTransitionErrorMessage = (fromStatusName, toStatusName) => {
  return `Cannot move task from "${fromStatusName}" to "${toStatusName}". This transition is not allowed by the workflow rules.`;
};
