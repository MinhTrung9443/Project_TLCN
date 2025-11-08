const Workflow = require("../models/Workflow");
const Project = require("../models/Project");
const mongoose = require("mongoose");

class WorkflowService {
  async getDefaultWorkflow() {
    try {
      const workflow = await Workflow.findOne({ isDefault: true });
      if (!workflow) {
        throw new Error("No default workflow found");
      }
      return workflow;
    } catch (error) {
      throw error;
    }
  }

  async getWorkflowByProject(projectKey) {
    try {
      // Find project by key
      const project = await Project.findOne({ key: projectKey.toUpperCase() });
      if (!project) {
        throw new Error("Project not found");
      }

      // Find workflow for this project
      const workflow = await Workflow.findOne({ projectId: project._id });
      if (!workflow) {
        // Fallback to default workflow if project doesn't have one
        return await this.getDefaultWorkflow();
      }

      // Populate transitions with full status info
      const workflowObj = workflow.toObject();
      workflowObj.transitions = workflowObj.transitions.map((transition) => {
        const fromStatus = workflowObj.statuses.find((s) => s._id.toString() === transition.from.toString());
        const toStatus = workflowObj.statuses.find((s) => s._id.toString() === transition.to.toString());

        return {
          ...transition,
          fromStatus: fromStatus
            ? {
                _id: fromStatus._id,
                name: fromStatus.name,
                category: fromStatus.category,
              }
            : null,
          toStatus: toStatus
            ? {
                _id: toStatus._id,
                name: toStatus.name,
                category: toStatus.category,
              }
            : null,
        };
      });

      return workflowObj;
    } catch (error) {
      throw error;
    }
  }

  async getWorkflowById(workflowId) {
    try {
      const workflow = await Workflow.findById(workflowId);
      if (!workflow) {
        throw new Error("Workflow not found");
      }
      return workflow;
    } catch (error) {
      throw error;
    }
  }
  async getAllStatuses() {
    try {
      const defaultWorkflow = await Workflow.findOne({ isDefault: true });

      if (!defaultWorkflow) {
        throw new Error("Default workflow not found. Cannot get status list.");
      }

      return defaultWorkflow.statuses || [];
    } catch (error) {
      console.error("Error in getAllStatuses:", error);
      throw error;
    }
  }

  // ============================================
  // STATUSES MANAGEMENT
  // ============================================

  async addStatus(projectKey, statusData) {
    try {
      const { name, category } = statusData;

      // Find project
      const project = await Project.findOne({ key: projectKey.toUpperCase() });
      if (!project) {
        const error = new Error("Project not found");
        error.statusCode = 404;
        throw error;
      }

      // Find workflow for this project
      let workflow = await Workflow.findOne({ projectId: project._id });
      if (!workflow) {
        const error = new Error("Workflow not found for this project");
        error.statusCode = 404;
        throw error;
      }

      // Check if status name already exists
      const existingStatus = workflow.statuses.find((s) => s.name.toLowerCase() === name.toLowerCase());
      if (existingStatus) {
        const error = new Error("Status with this name already exists");
        error.statusCode = 400;
        throw error;
      }

      // Add new status
      const newStatus = {
        _id: new mongoose.Types.ObjectId(),
        name: name.trim(),
        category,
      };

      workflow.statuses.push(newStatus);
      await workflow.save();

      return {
        status: newStatus,
        workflow,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateStatus(projectKey, statusId, statusData) {
    try {
      const { name, category } = statusData;

      // Find project
      const project = await Project.findOne({ key: projectKey.toUpperCase() });
      if (!project) {
        const error = new Error("Project not found");
        error.statusCode = 404;
        throw error;
      }

      // Find workflow
      let workflow = await Workflow.findOne({ projectId: project._id });
      if (!workflow) {
        const error = new Error("Workflow not found for this project");
        error.statusCode = 404;
        throw error;
      }

      // Find status to update
      const statusIndex = workflow.statuses.findIndex((s) => s._id.toString() === statusId);
      if (statusIndex === -1) {
        const error = new Error("Status not found");
        error.statusCode = 404;
        throw error;
      }

      // Check if new name conflicts with existing status
      if (name) {
        const existingStatus = workflow.statuses.find((s, idx) => idx !== statusIndex && s.name.toLowerCase() === name.toLowerCase());
        if (existingStatus) {
          const error = new Error("Status with this name already exists");
          error.statusCode = 400;
          throw error;
        }
      }

      // Update status
      if (name) workflow.statuses[statusIndex].name = name.trim();
      if (category) workflow.statuses[statusIndex].category = category;

      await workflow.save();

      return {
        status: workflow.statuses[statusIndex],
        workflow,
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteStatus(projectKey, statusId) {
    try {
      // Find project
      const project = await Project.findOne({ key: projectKey.toUpperCase() });
      if (!project) {
        const error = new Error("Project not found");
        error.statusCode = 404;
        throw error;
      }

      // Find workflow
      let workflow = await Workflow.findOne({ projectId: project._id });
      if (!workflow) {
        const error = new Error("Workflow not found for this project");
        error.statusCode = 404;
        throw error;
      }

      // Check if status exists
      const statusIndex = workflow.statuses.findIndex((s) => s._id.toString() === statusId);
      if (statusIndex === -1) {
        const error = new Error("Status not found");
        error.statusCode = 404;
        throw error;
      }

      // Check if status is used in any transitions
      const usedInTransitions = workflow.transitions.some((t) => t.from.toString() === statusId || t.to.toString() === statusId);
      if (usedInTransitions) {
        const error = new Error("Cannot delete status: it is used in transitions. Remove the transitions first.");
        error.statusCode = 400;
        throw error;
      }

      // Remove status
      workflow.statuses.splice(statusIndex, 1);
      await workflow.save();

      return { workflow };
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // TRANSITIONS (RULES) MANAGEMENT
  // ============================================

  async addTransition(projectKey, transitionData) {
    try {
      const { from, to, name } = transitionData;

      // Find project
      const project = await Project.findOne({ key: projectKey.toUpperCase() });
      if (!project) {
        const error = new Error("Project not found");
        error.statusCode = 404;
        throw error;
      }

      // Find workflow
      let workflow = await Workflow.findOne({ projectId: project._id });
      if (!workflow) {
        const error = new Error("Workflow not found for this project");
        error.statusCode = 404;
        throw error;
      }

      // Validate from and to status exist
      const fromStatus = workflow.statuses.find((s) => s._id.toString() === from);
      const toStatus = workflow.statuses.find((s) => s._id.toString() === to);

      if (!fromStatus) {
        const error = new Error("Source status not found");
        error.statusCode = 404;
        throw error;
      }
      if (!toStatus) {
        const error = new Error("Target status not found");
        error.statusCode = 404;
        throw error;
      }

      // Check if transition already exists
      const existingTransition = workflow.transitions.find((t) => t.from.toString() === from && t.to.toString() === to);
      if (existingTransition) {
        const error = new Error("Transition already exists between these statuses");
        error.statusCode = 400;
        throw error;
      }

      // Generate name if not provided
      const transitionName = name || `${fromStatus.name} → ${toStatus.name}`;

      // Add new transition
      const newTransition = {
        _id: new mongoose.Types.ObjectId(),
        name: transitionName,
        from: mongoose.Types.ObjectId(from),
        to: mongoose.Types.ObjectId(to),
      };

      workflow.transitions.push(newTransition);
      await workflow.save();

      // Return transition with populated status info
      const transitionWithInfo = {
        ...newTransition.toObject(),
        fromStatus: {
          _id: fromStatus._id,
          name: fromStatus.name,
          category: fromStatus.category,
        },
        toStatus: {
          _id: toStatus._id,
          name: toStatus.name,
          category: toStatus.category,
        },
      };

      return {
        transition: transitionWithInfo,
        workflow,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateTransition(projectKey, transitionId, transitionData) {
    try {
      const { from, to, name } = transitionData;

      // Find project
      const project = await Project.findOne({ key: projectKey.toUpperCase() });
      if (!project) {
        const error = new Error("Project not found");
        error.statusCode = 404;
        throw error;
      }

      // Find workflow
      let workflow = await Workflow.findOne({ projectId: project._id });
      if (!workflow) {
        const error = new Error("Workflow not found for this project");
        error.statusCode = 404;
        throw error;
      }

      // Find transition to update
      const transitionIndex = workflow.transitions.findIndex((t) => t._id.toString() === transitionId);
      if (transitionIndex === -1) {
        const error = new Error("Transition not found");
        error.statusCode = 404;
        throw error;
      }

      // Validate new from/to if provided
      if (from) {
        const fromStatus = workflow.statuses.find((s) => s._id.toString() === from);
        if (!fromStatus) {
          const error = new Error("Source status not found");
          error.statusCode = 404;
          throw error;
        }
      }

      if (to) {
        const toStatus = workflow.statuses.find((s) => s._id.toString() === to);
        if (!toStatus) {
          const error = new Error("Target status not found");
          error.statusCode = 404;
          throw error;
        }
      }

      // Check for duplicate transition
      const newFrom = from || workflow.transitions[transitionIndex].from.toString();
      const newTo = to || workflow.transitions[transitionIndex].to.toString();

      const duplicateTransition = workflow.transitions.find(
        (t, idx) => idx !== transitionIndex && t.from.toString() === newFrom && t.to.toString() === newTo
      );
      if (duplicateTransition) {
        const error = new Error("Transition already exists between these statuses");
        error.statusCode = 400;
        throw error;
      }

      // Update transition
      if (name) workflow.transitions[transitionIndex].name = name;
      if (from) workflow.transitions[transitionIndex].from = mongoose.Types.ObjectId(from);
      if (to) workflow.transitions[transitionIndex].to = mongoose.Types.ObjectId(to);

      await workflow.save();

      // Get updated transition with status info
      const updatedTransition = workflow.transitions[transitionIndex];
      const fromStatus = workflow.statuses.find((s) => s._id.toString() === updatedTransition.from.toString());
      const toStatus = workflow.statuses.find((s) => s._id.toString() === updatedTransition.to.toString());

      const transitionWithInfo = {
        ...updatedTransition.toObject(),
        fromStatus: {
          _id: fromStatus._id,
          name: fromStatus.name,
          category: fromStatus.category,
        },
        toStatus: {
          _id: toStatus._id,
          name: toStatus.name,
          category: toStatus.category,
        },
      };

      return {
        transition: transitionWithInfo,
        workflow,
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteTransition(projectKey, transitionId) {
    try {
      // Find project
      const project = await Project.findOne({ key: projectKey.toUpperCase() });
      if (!project) {
        const error = new Error("Project not found");
        error.statusCode = 404;
        throw error;
      }

      // Find workflow
      let workflow = await Workflow.findOne({ projectId: project._id });
      if (!workflow) {
        const error = new Error("Workflow not found for this project");
        error.statusCode = 404;
        throw error;
      }

      // Find transition to delete
      const transitionIndex = workflow.transitions.findIndex((t) => t._id.toString() === transitionId);
      if (transitionIndex === -1) {
        const error = new Error("Transition not found");
        error.statusCode = 404;
        throw error;
      }

      // Remove transition
      workflow.transitions.splice(transitionIndex, 1);
      await workflow.save();

      return { workflow };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new WorkflowService();
