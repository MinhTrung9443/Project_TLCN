import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import dagre from "dagre";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import workflowService from "../../services/workflowService";
import { getProjectByKey } from "../../services/projectService";
import { useAuth } from "../../contexts/AuthContext";

const CATEGORY_META = {
  "To Do": { color: "bg-primary-100", dot: "bg-primary-600", text: "text-primary-800" },
  "In Progress": { color: "bg-amber-100", dot: "bg-amber-500", text: "text-amber-800" },
  Done: { color: "bg-emerald-100", dot: "bg-emerald-500", text: "text-emerald-800" },
};

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

const getDiagramColors = (category) => {
  switch (category) {
    case "To Do":
      return { bg: "#eef2ff", border: "#6366f1", text: "#312e81" };
    case "In Progress":
      return { bg: "#fff7ed", border: "#f59e0b", text: "#92400e" };
    case "Done":
      return { bg: "#ecfdf3", border: "#10b981", text: "#065f46" };
    default:
      return { bg: "#f3f4f6", border: "#6b7280", text: "#374151" };
  }
};

const Modal = ({ title, onClose, children, footer }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-neutral-200" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-900 m-0">{title}</h3>
        <button className="p-2 text-neutral-500 hover:text-neutral-800 rounded-lg hover:bg-neutral-100" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="p-6 space-y-4">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-xl flex justify-end gap-3">{footer}</div>}
    </div>
  </div>
);

const ProjectSettingsWorkflow = () => {
  const { projectKey } = useParams();
  const { user } = useAuth();

  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProjectRole, setUserProjectRole] = useState(null);

  const [statusForm, setStatusForm] = useState({ name: "", category: "To Do" });
  const [transitionForm, setTransitionForm] = useState({ from: "", to: "", name: "" });
  const [editingStatus, setEditingStatus] = useState(null);
  const [editingTransition, setEditingTransition] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const canEdit = user?.role === "admin" || userProjectRole === "PROJECT_MANAGER";

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([fetchWorkflow(), fetchUserRole()]);
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey]);

  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      const data = await workflowService.getWorkflowByProject(projectKey);
      setWorkflow(data);
    } catch (error) {
      toast.error("Failed to load workflow");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async () => {
    if (!projectKey || !user) return;
    try {
      const response = await getProjectByKey(projectKey);
      const member = response.data?.members?.find((m) => m.userId?._id === user._id);
      setUserProjectRole(member?.role || null);
    } catch (error) {
      toast.error("Could not verify your project role");
    }
  };

  const handleOpenStatusModal = (status) => {
    setEditingStatus(status || null);
    setStatusForm(status ? { name: status.name, category: status.category } : { name: "", category: "To Do" });
    setIsStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!statusForm.name.trim()) {
      toast.error("Status name is required");
      return;
    }

    try {
      if (editingStatus) {
        await workflowService.updateStatus(projectKey, editingStatus._id, statusForm);
        toast.success("Status updated");
      } else {
        await workflowService.addStatus(projectKey, statusForm);
        toast.success("Status created");
      }
      setIsStatusModalOpen(false);
      setEditingStatus(null);
      fetchWorkflow();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save status");
    }
  };

  const handleDeleteStatus = async () => {
    if (!deleteTarget) return;
    try {
      await workflowService.deleteStatus(projectKey, deleteTarget.id);
      toast.success("Status deleted");
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchWorkflow();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete status");
    }
  };

  const handleOpenTransitionModal = (transition) => {
    setEditingTransition(transition || null);
    setTransitionForm(transition ? { from: transition.from, to: transition.to, name: transition.name || "" } : { from: "", to: "", name: "" });
    setIsTransitionModalOpen(true);
  };

  const handleSaveTransition = async () => {
    if (!transitionForm.from || !transitionForm.to) {
      toast.error("Please select both source and target statuses");
      return;
    }

    try {
      if (editingTransition) {
        await workflowService.updateTransition(projectKey, editingTransition._id, transitionForm);
        toast.success("Transition updated");
      } else {
        await workflowService.addTransition(projectKey, transitionForm);
        toast.success("Transition created");
      }
      setIsTransitionModalOpen(false);
      setEditingTransition(null);
      fetchWorkflow();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save transition");
    }
  };

  const handleDeleteTransition = async () => {
    if (!deleteTarget) return;
    try {
      await workflowService.deleteTransition(projectKey, deleteTarget.id);
      toast.success("Transition deleted");
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchWorkflow();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete transition");
    }
  };

  const statuses = workflow?.statuses || [];
  const transitions = workflow?.transitions || [];

  const diagram = useMemo(() => {
    if (!statuses.length) return null;

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", nodesep: 100, ranksep: 150, marginx: 48, marginy: 48 });
    g.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 160;
    const nodeHeight = 64;
    statuses.forEach((status) => {
      g.setNode(status._id, { label: status.name, width: nodeWidth, height: nodeHeight, status });
    });

    transitions.forEach((transition) => {
      g.setEdge(transition.from, transition.to, { transition });
    });

    dagre.layout(g);

    const { width = 0, height = 0 } = g.graph();
    const svgWidth = width + 120;
    const svgHeight = height + 120;

    const edges = g.edges().map((e, idx) => {
      const edge = g.edge(e);
      const points = edge.points;
      if (!points || !points.length) return null;

      const reverseKey = `${e.w}-${e.v}`;
      const hasReverse = g.edges().some((rev) => rev.v === e.w && rev.w === e.v && !(rev.v === e.v && rev.w === e.w));

      let pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
      let labelPoint = points[Math.floor(points.length / 2)];

      if (hasReverse && points.length >= 2) {
        const start = points[0];
        const end = points[points.length - 1];
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        const offset = 40;
        const perpX = (-dy / length) * offset;
        const perpY = (dx / length) * offset;
        const controlX = midX - perpX;
        const controlY = midY - perpY;
        pathData = `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
        labelPoint = { x: (start.x + 2 * controlX + end.x) / 4, y: (start.y + 2 * controlY + end.y) / 4 };
      }

      const transitionName = edge.transition?.name || "";
      const displayName = transitionName.length > 18 ? `${transitionName.slice(0, 15)}...` : transitionName;
      const textWidth = Math.min(Math.max(displayName.length * 6.5, 40), 140);

      return (
        <g key={`edge-${e.v}-${e.w}-${idx}`}>
          <path d={pathData} fill="none" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" />
          {transitionName && (
            <>
              <rect x={labelPoint.x - textWidth / 2} y={labelPoint.y - 12} width={textWidth} height={20} rx={6} fill="#fff" stroke="#e2e8f0" />
              <text x={labelPoint.x} y={labelPoint.y + 1} textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600">
                <title>{transitionName}</title>
                {displayName}
              </text>
            </>
          )}
        </g>
      );
    });

    const nodes = g.nodes().map((nodeId) => {
      const node = g.node(nodeId);
      const status = node.status;
      const { bg, border, text } = getDiagramColors(status.category);
      const x = node.x - node.width / 2;
      const y = node.y - node.height / 2;

      return (
        <g key={nodeId}>
          <rect x={x} y={y} width={node.width} height={node.height} rx={10} fill={bg} stroke={border} strokeWidth="2" />
          <text x={node.x} y={node.y - 2} textAnchor="middle" fill={text} fontSize="14" fontWeight="700">
            {status.name}
          </text>
          <text x={node.x} y={node.y + 16} textAnchor="middle" fill={text} fontSize="11" opacity="0.75">
            {status.category}
          </text>
        </g>
      );
    });

    return (
      <svg width={svgWidth} height={svgHeight} className="min-w-full" role="img" aria-label="Workflow diagram">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>
        {edges}
        {nodes}
      </svg>
    );
  }, [statuses, transitions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" text="Loading workflow..." />
      </div>
    );
  }

  if (!workflow) {
    return <EmptyState icon="schema" title="No workflow found" description="This project does not have a workflow yet." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Configuration"
        subtitle={`Manage statuses, transitions, and the visual flow for ${projectKey}`}
        icon="schema"
        badge={`Statuses: ${statuses.length}`}
        actions={
          canEdit && (
            <div className="flex items-center gap-3">
              <Button variant="secondary" icon="add" onClick={() => handleOpenStatusModal()}>
                Status
              </Button>
              <Button variant="primary" icon="trending_flat" onClick={() => handleOpenTransitionModal()}>
                Transition
              </Button>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6 items-start">
        <Card
          header={
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 m-0">Statuses</h3>
                <p className="text-sm text-neutral-600 m-0">Define the lifecycle buckets for tasks</p>
              </div>
              {canEdit && (
                <Button size="sm" variant="primary" icon="add" onClick={() => handleOpenStatusModal()}>
                  Add status
                </Button>
              )}
            </div>
          }
        >
          {statuses.length === 0 ? (
            <EmptyState
              icon="view_timeline"
              title="No statuses"
              description="Create at least one status to start configuring the workflow."
              action={
                canEdit && (
                  <Button icon="add" onClick={() => handleOpenStatusModal()}>
                    Create status
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-3">
              {statuses.map((status) => {
                const meta = CATEGORY_META[status.category] || { color: "bg-neutral-100", dot: "bg-neutral-400", text: "text-neutral-800" };
                return (
                  <div
                    key={status._id}
                    className="flex items-center justify-between gap-4 p-4 border border-neutral-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-10 h-10 rounded-full ${meta.color} flex items-center justify-center`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-neutral-900 truncate">{status.name}</div>
                        <div className={`text-xs font-medium ${meta.text}`}>{status.category}</div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" icon="edit" onClick={() => handleOpenStatusModal(status)} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-accent-600 hover:bg-accent-50"
                          icon="delete"
                          onClick={() => {
                            setDeleteTarget({ type: "status", id: status._id, name: status.name });
                            setIsDeleteModalOpen(true);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          header={
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 m-0">Transition Rules</h3>
                <p className="text-sm text-neutral-600 m-0">Control which movements are allowed between statuses</p>
              </div>
              {canEdit && (
                <Button size="sm" variant="secondary" icon="add" onClick={() => handleOpenTransitionModal()}>
                  Add rule
                </Button>
              )}
            </div>
          }
        >
          {transitions.length === 0 ? (
            <EmptyState
              icon="sync_alt"
              title="No transitions"
              description="Add rules so tasks can move between statuses."
              action={
                canEdit && (
                  <Button icon="add" onClick={() => handleOpenTransitionModal()}>
                    Create rule
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-3">
              {transitions.map((transition) => (
                <div
                  key={transition._id}
                  className="flex items-center justify-between gap-3 p-4 border border-neutral-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <Badge size="sm" variant="primary">
                      {transition.fromStatus?.name || "Unknown"}
                    </Badge>
                    <span className="material-symbols-outlined text-neutral-400">arrow_forward</span>
                    <Badge size="sm" variant="success">
                      {transition.toStatus?.name || "Unknown"}
                    </Badge>
                    {transition.name && <span className="text-sm text-neutral-600">· {transition.name}</span>}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" icon="edit" onClick={() => handleOpenTransitionModal(transition)} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-accent-600 hover:bg-accent-50"
                        icon="delete"
                        onClick={() => {
                          setDeleteTarget({ type: "transition", id: transition._id, name: transition.name || "Transition" });
                          setIsDeleteModalOpen(true);
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card
        header={
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 m-0">Workflow Diagram</h3>
              <p className="text-sm text-neutral-600 m-0">Visual map of allowed movements</p>
            </div>
          </div>
        }
        padding={false}
      >
        <div className="overflow-auto p-6 bg-neutral-50 border-t border-neutral-200 rounded-b-xl">
          {diagram || <div className="py-10 text-center text-neutral-500">Add statuses to see the workflow map.</div>}
        </div>
      </Card>

      {isStatusModalOpen && (
        <Modal
          title={editingStatus ? "Edit Status" : "Create Status"}
          onClose={() => {
            setIsStatusModalOpen(false);
            setEditingStatus(null);
          }}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveStatus}>Save</Button>
            </>
          }
        >
          <Input
            label="Status name"
            value={statusForm.name}
            onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
            placeholder="e.g. In Review"
            required
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-neutral-700 mb-2">Category</label>
            <select
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={statusForm.category}
              onChange={(e) => setStatusForm({ ...statusForm, category: e.target.value })}
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
        </Modal>
      )}

      {isTransitionModalOpen && (
        <Modal
          title={editingTransition ? "Edit Transition" : "Create Transition"}
          onClose={() => {
            setIsTransitionModalOpen(false);
            setEditingTransition(null);
          }}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsTransitionModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTransition}>Save</Button>
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">From status</label>
              <select
                className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={transitionForm.from}
                onChange={(e) => setTransitionForm({ ...transitionForm, from: e.target.value })}
              >
                <option value="">Select source</option>
                {statuses.map((status) => (
                  <option key={status._id} value={status._id}>
                    {status.name} ({status.category})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">To status</label>
              <select
                className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={transitionForm.to}
                onChange={(e) => setTransitionForm({ ...transitionForm, to: e.target.value })}
              >
                <option value="">Select target</option>
                {statuses.map((status) => (
                  <option key={status._id} value={status._id}>
                    {status.name} ({status.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Input
            label="Transition name (optional)"
            value={transitionForm.name}
            onChange={(e) => setTransitionForm({ ...transitionForm, name: e.target.value })}
            placeholder="Auto-generated if empty"
          />
        </Modal>
      )}

      {isDeleteModalOpen && (
        <Modal
          title="Confirm delete"
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
          }}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={deleteTarget?.type === "status" ? handleDeleteStatus : handleDeleteTransition}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-neutral-700">
            Are you sure you want to delete this {deleteTarget?.type}? {deleteTarget?.type === "status" && "Make sure it is not used in transitions."}
          </p>
          <p className="text-base font-semibold text-neutral-900">{deleteTarget?.name || "Item"}</p>
        </Modal>
      )}
    </div>
  );
};

export default ProjectSettingsWorkflow;
