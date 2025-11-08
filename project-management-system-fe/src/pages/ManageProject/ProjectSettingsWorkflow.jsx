import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import workflowService from "../../services/workflowService";
import "../../styles/pages/ManageProject/ProjectSettings_Workflow.css";

const ProjectSettingsWorkflow = () => {
  const { projectKey } = useParams();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit state
  const [editingStatus, setEditingStatus] = useState(null);
  const [editingTransition, setEditingTransition] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form state
  const [statusForm, setStatusForm] = useState({ name: "", category: "To Do" });
  const [transitionForm, setTransitionForm] = useState({ from: "", to: "", name: "" });

  useEffect(() => {
    fetchWorkflow();
  }, [projectKey]);

  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      const data = await workflowService.getWorkflowByProject(projectKey);
      setWorkflow(data);
    } catch (error) {
      toast.error("Failed to load workflow");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // STATUS HANDLERS
  // ============================================

  const openAddStatusModal = () => {
    setEditingStatus(null);
    setStatusForm({ name: "", category: "To Do" });
    setShowStatusModal(true);
  };

  const openEditStatusModal = (status) => {
    setEditingStatus(status);
    setStatusForm({ name: status.name, category: status.category });
    setShowStatusModal(true);
  };

  const handleSaveStatus = async () => {
    try {
      if (!statusForm.name.trim()) {
        toast.error("Status name is required");
        return;
      }

      if (editingStatus) {
        await workflowService.updateStatus(projectKey, editingStatus._id, statusForm);
        toast.success("Status updated successfully");
      } else {
        await workflowService.addStatus(projectKey, statusForm);
        toast.success("Status added successfully");
      }

      setShowStatusModal(false);
      fetchWorkflow();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save status");
    }
  };

  const handleDeleteStatus = async () => {
    try {
      await workflowService.deleteStatus(projectKey, deleteTarget.id);
      toast.success("Status deleted successfully");
      setShowDeleteConfirm(false);
      fetchWorkflow();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete status");
    }
  };

  // ============================================
  // TRANSITION HANDLERS
  // ============================================

  const openAddTransitionModal = () => {
    setEditingTransition(null);
    setTransitionForm({ from: "", to: "", name: "" });
    setShowTransitionModal(true);
  };

  const openEditTransitionModal = (transition) => {
    setEditingTransition(transition);
    setTransitionForm({
      from: transition.from,
      to: transition.to,
      name: transition.name,
    });
    setShowTransitionModal(true);
  };

  const handleSaveTransition = async () => {
    try {
      if (!transitionForm.from || !transitionForm.to) {
        toast.error("Please select both source and target status");
        return;
      }

      if (editingTransition) {
        await workflowService.updateTransition(projectKey, editingTransition._id, transitionForm);
        toast.success("Transition updated successfully");
      } else {
        await workflowService.addTransition(projectKey, transitionForm);
        toast.success("Transition added successfully");
      }

      setShowTransitionModal(false);
      fetchWorkflow();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save transition");
    }
  };

  const handleDeleteTransition = async () => {
    try {
      await workflowService.deleteTransition(projectKey, deleteTarget.id);
      toast.success("Transition deleted successfully");
      setShowDeleteConfirm(false);
      fetchWorkflow();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete transition");
    }
  };

  // ============================================
  // DIAGRAM HELPERS
  // ============================================

  const getCategoryColor = (category) => {
    switch (category) {
      case "To Do":
        return "#6366f1";
      case "In Progress":
        return "#f59e0b";
      case "Done":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  if (loading) {
    return <div className="workflow-loading">Loading workflow...</div>;
  }

  if (!workflow) {
    return <div className="workflow-error">No workflow found for this project</div>;
  }

  return (
    <div className="workflow-settings-container">
      {/* Header */}
      <div className="workflow-header">
        <h2>Workflow Configuration</h2>
        <p>Manage statuses and transition rules for {projectKey}</p>
      </div>

      {/* Main Content Grid */}
      <div className="workflow-content-grid">
        {/* Left Column - Statuses */}
        <div className="workflow-section">
          <div className="section-header">
            <h3>Statuses</h3>
            <button className="btn-add" onClick={openAddStatusModal}>
              <span className="material-symbols-outlined">add</span>
              Add Status
            </button>
          </div>

          <div className="statuses-list">
            {workflow.statuses?.map((status) => (
              <div key={status._id} className="status-card">
                <div className="status-info">
                  <div className="status-indicator" style={{ backgroundColor: getCategoryColor(status.category) }} />
                  <div className="status-details">
                    <div className="status-name">{status.name}</div>
                    <div className="status-category">{status.category}</div>
                  </div>
                </div>
                <div className="status-actions">
                  <button className="btn-icon" onClick={() => openEditStatusModal(status)} title="Edit">
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => {
                      setDeleteTarget({ type: "status", id: status._id, name: status.name });
                      setShowDeleteConfirm(true);
                    }}
                    title="Delete"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Transitions */}
        <div className="workflow-section">
          <div className="section-header">
            <h3>Transition Rules</h3>
            <button className="btn-add" onClick={openAddTransitionModal}>
              <span className="material-symbols-outlined">add</span>
              Add Rule
            </button>
          </div>

          <div className="transitions-list">
            {workflow.transitions?.map((transition) => (
              <div key={transition._id} className="transition-card">
                <div className="transition-flow">
                  <div className="transition-status from">
                    <div className="status-dot" style={{ backgroundColor: getCategoryColor(transition.fromStatus?.category) }} />
                    <span>{transition.fromStatus?.name || "Unknown"}</span>
                  </div>
                  <span className="material-symbols-outlined arrow">arrow_forward</span>
                  <div className="transition-status to">
                    <div className="status-dot" style={{ backgroundColor: getCategoryColor(transition.toStatus?.category) }} />
                    <span>{transition.toStatus?.name || "Unknown"}</span>
                  </div>
                </div>
                <div className="transition-actions">
                  <button className="btn-icon" onClick={() => openEditTransitionModal(transition)} title="Edit">
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => {
                      setDeleteTarget({ type: "transition", id: transition._id, name: transition.name });
                      setShowDeleteConfirm(true);
                    }}
                    title="Delete"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom - Workflow Diagram */}
      <div className="workflow-diagram-section">
        <div className="section-header">
          <h3>Workflow Diagram</h3>
          <span className="diagram-subtitle">Visual representation of status flow</span>
        </div>

        <div className="workflow-diagram">
          <svg width="100%" height="400" className="diagram-svg">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
              </marker>
            </defs>

            {/* Render statuses as nodes */}
            {workflow.statuses?.map((status, index) => {
              const x = 100 + (index % 4) * 200;
              const y = 80 + Math.floor(index / 4) * 120;

              return (
                <g key={status._id}>
                  <rect x={x - 60} y={y - 25} width="120" height="50" rx="8" fill={getCategoryColor(status.category)} opacity="0.9" />
                  <text x={x} y={y + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="500">
                    {status.name}
                  </text>
                </g>
              );
            })}

            {/* Render transitions as arrows */}
            {workflow.transitions?.map((transition, index) => {
              const fromIndex = workflow.statuses?.findIndex((s) => s._id === transition.from);
              const toIndex = workflow.statuses?.findIndex((s) => s._id === transition.to);

              if (fromIndex === -1 || toIndex === -1) return null;

              const x1 = 100 + (fromIndex % 4) * 200 + 60;
              const y1 = 80 + Math.floor(fromIndex / 4) * 120;
              const x2 = 100 + (toIndex % 4) * 200 - 60;
              const y2 = 80 + Math.floor(toIndex / 4) * 120;

              // Curved path for better visualization
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2 - 30;

              return (
                <path
                  key={transition._id}
                  d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingStatus ? "Edit Status" : "Add New Status"}</h3>
              <button className="modal-close" onClick={() => setShowStatusModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Status Name *</label>
                <input
                  type="text"
                  value={statusForm.name}
                  onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                  placeholder="e.g., In Review"
                />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select value={statusForm.category} onChange={(e) => setStatusForm({ ...statusForm, category: e.target.value })}>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowStatusModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveStatus}>
                {editingStatus ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transition Modal */}
      {showTransitionModal && (
        <div className="modal-overlay" onClick={() => setShowTransitionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTransition ? "Edit Transition" : "Add New Transition"}</h3>
              <button className="modal-close" onClick={() => setShowTransitionModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>From Status *</label>
                <select value={transitionForm.from} onChange={(e) => setTransitionForm({ ...transitionForm, from: e.target.value })}>
                  <option value="">Select source status</option>
                  {workflow.statuses?.map((status) => (
                    <option key={status._id} value={status._id}>
                      {status.name} ({status.category})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>To Status *</label>
                <select value={transitionForm.to} onChange={(e) => setTransitionForm({ ...transitionForm, to: e.target.value })}>
                  <option value="">Select target status</option>
                  {workflow.statuses?.map((status) => (
                    <option key={status._id} value={status._id}>
                      {status.name} ({status.category})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Transition Name (Optional)</label>
                <input
                  type="text"
                  value={transitionForm.name}
                  onChange={(e) => setTransitionForm({ ...transitionForm, name: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowTransitionModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveTransition}>
                {editingTransition ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this {deleteTarget?.type}?</p>
              <p className="delete-warning">
                <strong>{deleteTarget?.name}</strong>
              </p>
              {deleteTarget?.type === "status" && (
                <p className="warning-text">
                  <span className="material-symbols-outlined">warning</span>
                  This will fail if the status is used in transitions.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={deleteTarget?.type === "status" ? handleDeleteStatus : handleDeleteTransition}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSettingsWorkflow;
