import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import dagre from "dagre";
import workflowService from "../../services/workflowService";
import { getProjectByKey } from "../../services/projectService";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/pages/ManageProject/ProjectSettings_Workflow.css";

const ProjectSettingsWorkflow = () => {
  const { projectKey } = useParams();
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProjectRole, setUserProjectRole] = useState(null);

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

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!projectKey || !user) return;
      try {
        const response = await getProjectByKey(projectKey);
        const project = response.data;
        const member = project.members?.find((m) => m.userId._id === user._id);
        setUserProjectRole(member?.role || null);
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };
    fetchUserRole();
  }, [projectKey, user]);

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
  // PERMISSION CHECK
  // ============================================

  const canEdit = user?.role === "admin" || userProjectRole === "PROJECT_MANAGER";

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

  // Màu nền và viền cho workflow diagram (đồng bộ màu nhưng nhạt hơn)
  const getDiagramColors = (category) => {
    switch (category) {
      case "To Do":
        return { bg: "#e0e1f9", border: "#6366f1", text: "#333333" }; // Tím nhạt
      case "In Progress":
        return { bg: "#fef3e2", border: "#f59e0b", text: "#7c2d12" }; // Cam nhạt
      case "Done":
        return { bg: "#d1fae5", border: "#10b981", text: "#065f46" }; // Xanh lá nhạt
      default:
        return { bg: "#f3f4f6", border: "#6b7280", text: "#374151" };
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
            {canEdit && (
              <button className="btn-add" onClick={openAddStatusModal}>
                <span className="material-symbols-outlined">add</span>
                Add Status
              </button>
            )}
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
                {canEdit && (
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
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Transitions */}
        <div className="workflow-section">
          <div className="section-header">
            <h3>Transition Rules</h3>
            {canEdit && (
              <button className="btn-add" onClick={openAddTransitionModal}>
                <span className="material-symbols-outlined">add</span>
                Add Rule
              </button>
            )}
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
                {canEdit && (
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
                )}
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

        <div className="workflow-diagram" style={{ overflowX: "auto", overflowY: "auto" }}>
          {(() => {
            const statuses = workflow.statuses || [];
            const transitions = workflow.transitions || [];

            if (statuses.length === 0) {
              return <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>No statuses available</div>;
            }

            // Khởi tạo dagre graph
            const g = new dagre.graphlib.Graph();
            g.setGraph({
              rankdir: "LR", // Left to Right
              nodesep: 100, // Khoảng cách giữa nodes cùng rank
              ranksep: 150, // Khoảng cách giữa các ranks
              marginx: 50,
              marginy: 50,
            });
            g.setDefaultEdgeLabel(() => ({}));

            // Thêm nodes vào graph
            const nodeWidth = 150;
            const nodeHeight = 60;
            statuses.forEach((status) => {
              g.setNode(status._id, {
                label: status.name,
                width: nodeWidth,
                height: nodeHeight,
                status: status,
              });
            });

            // Thêm edges vào graph
            transitions.forEach((transition) => {
              g.setEdge(transition.from, transition.to, {
                transition: transition,
              });
            });

            // Chạy layout algorithm
            dagre.layout(g);

            // Lấy kích thước graph
            const graphAttrs = g.graph();
            const svgWidth = graphAttrs.width + 100;
            const svgHeight = graphAttrs.height + 100;

            return (
              <svg width={svgWidth} height={svgHeight} className="diagram-svg" style={{ minWidth: "100%" }}>
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#333" />
                  </marker>
                </defs>

                {/* Vẽ edges (transitions) trước để nằm phía dưới */}
                {(() => {
                  const allEdges = g.edges();

                  // Track edges đã vẽ để xác định hướng cong
                  const drawnEdges = new Set();

                  return allEdges.map((e, idx) => {
                    const edge = g.edge(e);
                    const points = edge.points;

                    if (!points || points.length === 0) return null;

                    // Kiểm tra xem có edge ngược chiều đã vẽ chưa
                    const reverseKey = `${e.w}-${e.v}`;
                    const hasReverseDrawn = drawnEdges.has(reverseKey);
                    const currentKey = `${e.v}-${e.w}`;
                    drawnEdges.add(currentKey);

                    let pathData;
                    let labelPoint;

                    if (hasReverseDrawn && points.length >= 2) {
                      // Edge ngược chiều đã được vẽ - vẽ đường cong theo hướng ngược lại
                      const start = points[0];
                      const end = points[points.length - 1];

                      // Tính điểm giữa
                      const midX = (start.x + end.x) / 2;
                      const midY = (start.y + end.y) / 2;

                      // Tính vector vuông góc
                      const dx = end.x - start.x;
                      const dy = end.y - start.y;
                      const length = Math.sqrt(dx * dx + dy * dy);

                      if (length > 0) {
                        // Offset 40px
                        const offset = 40;
                        const perpX = (-dy / length) * offset;
                        const perpY = (dx / length) * offset;

                        // Cong về phía dưới (hướng -1)
                        const controlX = midX - perpX;
                        const controlY = midY - perpY;

                        pathData = `M ${start.x} ${start.y} Q ${controlX} ${controlY}, ${end.x} ${end.y}`;

                        labelPoint = {
                          x: (start.x + 2 * controlX + end.x) / 4,
                          y: (start.y + 2 * controlY + end.y) / 4,
                        };
                      } else {
                        pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                        labelPoint = points[Math.floor(points.length / 2)];
                      }
                    } else {
                      // Edge đầu tiên hoặc không có reverse - vẽ đường thẳng
                      pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

                      const midIndex = Math.floor(points.length / 2);
                      labelPoint = points[midIndex];
                    }

                    // Lấy transition name và cắt nếu quá dài
                    const transitionName = edge.transition?.name || "";
                    const maxChars = 15;
                    const displayName = transitionName.length > maxChars ? transitionName.substring(0, maxChars - 3) + "..." : transitionName;

                    // Tính width động dựa trên độ dài text (tối đa)
                    const textWidth = Math.min(displayName.length * 7, 120);

                    return (
                      <g key={`edge-${e.v}-${e.w}-${idx}`}>
                        <path d={pathData} fill="none" stroke="#666" strokeWidth="2" markerEnd="url(#arrowhead)" />

                        {/* Hiển thị transition name nếu có */}
                        {transitionName && (
                          <>
                            {/* Background cho text */}
                            <rect
                              x={labelPoint.x - textWidth / 2}
                              y={labelPoint.y - 12}
                              width={textWidth}
                              height={18}
                              fill="white"
                              stroke="#999"
                              strokeWidth="1"
                              rx="3"
                            />
                            {/* Text label với title cho full text */}
                            <text
                              x={labelPoint.x}
                              y={labelPoint.y}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#333"
                              fontSize="11"
                              fontWeight="500"
                            >
                              <title>{transitionName}</title>
                              {displayName}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  });
                })()}

                {/* Vẽ nodes (statuses) */}
                {g.nodes().map((nodeId) => {
                  const node = g.node(nodeId);
                  const status = node.status;

                  // dagre tính toán vị trí center, cần chuyển về top-left
                  const x = node.x - node.width / 2;
                  const y = node.y - node.height / 2;

                  // Lấy màu từ category (pastel style)
                  const colors = getDiagramColors(status.category);

                  return (
                    <g key={nodeId}>
                      {/* Background box với màu pastel */}
                      <rect x={x} y={y} width={node.width} height={node.height} fill={colors.bg} stroke={colors.border} strokeWidth="2" rx="6" />

                      {/* Status name - màu tối để dễ đọc */}
                      <text x={node.x} y={node.y - 8} textAnchor="middle" fill={colors.text} fontSize="14" fontWeight="600">
                        {status.name}
                      </text>

                      {/* Category - màu nhạt hơn */}
                      <text x={node.x} y={node.y + 10} textAnchor="middle" fill={colors.text} fontSize="11" opacity="0.7">
                        {status.category}
                      </text>
                    </g>
                  );
                })}
              </svg>
            );
          })()}
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
                <label className="required">Status Name</label>
                <input
                  type="text"
                  value={statusForm.name}
                  onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                  placeholder="e.g., In Review"
                />
              </div>
              <div className="form-group">
                <label className="required">Category</label>
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
                <label className="required">From Status</label>
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
                <label className="required">To Status</label>
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
